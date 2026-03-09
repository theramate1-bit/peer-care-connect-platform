-- Enhance treatment exchange for mutual exchange system
-- Add fields to track mutual bookings and credit status

-- Add fields to mutual_exchange_sessions to track both bookings
ALTER TABLE public.mutual_exchange_sessions
ADD COLUMN IF NOT EXISTS practitioner_a_booked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS practitioner_b_booked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credits_deducted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS conversation_id UUID,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.mutual_exchange_sessions.practitioner_a_booked IS 'Whether practitioner A has confirmed their booking';
COMMENT ON COLUMN public.mutual_exchange_sessions.practitioner_b_booked IS 'Whether practitioner B has confirmed their booking';
COMMENT ON COLUMN public.mutual_exchange_sessions.credits_deducted IS 'Whether credits have been deducted from both accounts (only when both have booked)';
COMMENT ON COLUMN public.mutual_exchange_sessions.conversation_id IS 'Conversation ID for messaging between practitioners';
COMMENT ON COLUMN public.mutual_exchange_sessions.refund_percentage IS 'Percentage of credits refunded on cancellation (0-100)';

-- Add foreign key for conversation
ALTER TABLE public.mutual_exchange_sessions
ADD CONSTRAINT mutual_exchange_sessions_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Add foreign key for cancelled_by
ALTER TABLE public.mutual_exchange_sessions
ADD CONSTRAINT mutual_exchange_sessions_cancelled_by_fkey 
FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mutual_exchange_sessions_conversation_id 
ON public.mutual_exchange_sessions(conversation_id);

CREATE INDEX IF NOT EXISTS idx_mutual_exchange_sessions_credits_deducted 
ON public.mutual_exchange_sessions(credits_deducted);

-- Add field to track if recipient can book back
ALTER TABLE public.treatment_exchange_requests
ADD COLUMN IF NOT EXISTS recipient_can_book_back BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS recipient_booking_request_id UUID;

COMMENT ON COLUMN public.treatment_exchange_requests.recipient_can_book_back IS 'Whether recipient can book a service back from requester';
COMMENT ON COLUMN public.treatment_exchange_requests.recipient_booking_request_id IS 'ID of the reciprocal booking request from recipient to requester';

