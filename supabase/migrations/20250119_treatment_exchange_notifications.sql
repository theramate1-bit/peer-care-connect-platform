-- Migration: Treatment Exchange Notifications & Slot Holding
-- Created: 2025-01-19
-- Description: Enhanced notification system and slot holding for treatment exchanges

-- Enhanced notifications table for exchange-specific notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Slot holds table for temporary reservations during exchange requests
CREATE TABLE IF NOT EXISTS slot_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES treatment_exchange_requests(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released', 'converted')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slot_holds_practitioner_date ON slot_holds(practitioner_id, session_date);
CREATE INDEX IF NOT EXISTS idx_slot_holds_expires_at ON slot_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_slot_holds_request_id ON slot_holds(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type_entity ON notifications(notification_type, related_entity_type);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Function to automatically release expired slot holds
CREATE OR REPLACE FUNCTION release_expired_slot_holds()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE slot_holds 
  SET status = 'released', updated_at = NOW()
  WHERE expires_at < NOW() AND status = 'active';
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire old notifications
CREATE OR REPLACE FUNCTION expire_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE notifications 
  SET action_required = false, updated_at = NOW()
  WHERE expires_at < NOW() AND action_required = true;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for slot_holds table
ALTER TABLE slot_holds ENABLE ROW LEVEL SECURITY;

-- Practitioners can view their own slot holds
CREATE POLICY "Users can view their own slot holds" ON slot_holds
  FOR SELECT USING (auth.uid() = practitioner_id);

-- Practitioners can insert slot holds for themselves
CREATE POLICY "Users can create slot holds for themselves" ON slot_holds
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

-- Practitioners can update their own slot holds
CREATE POLICY "Users can update their own slot holds" ON slot_holds
  FOR UPDATE USING (auth.uid() = practitioner_id);

-- Practitioners can delete their own slot holds
CREATE POLICY "Users can delete their own slot holds" ON slot_holds
  FOR DELETE USING (auth.uid() = practitioner_id);

-- Enhanced RLS for notifications with exchange-specific access
CREATE POLICY "Users can view exchange notifications" ON notifications
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (notification_type LIKE 'exchange_%' AND related_entity_id IN (
      SELECT id FROM treatment_exchange_requests 
      WHERE requester_id = auth.uid() OR recipient_id = auth.uid()
    ))
  );

-- Grant necessary permissions
GRANT ALL ON slot_holds TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION release_expired_slot_holds() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_notifications() TO authenticated;
