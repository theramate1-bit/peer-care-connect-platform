/**
 * Database Service Layer
 * Provides actual CRUD operations for all tables
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export interface TherapistFavorite {
  id: string;
  client_id: string;
  therapist_id: string;
  created_at: string;
  updated_at: string;
}

export interface SessionFeedback {
  id: string;
  session_id: string;
  client_id: string;
  therapist_id: string;
  rating: number;
  pain_level_before: number;
  pain_level_after: number;
  feedback_text?: string;
  what_went_well?: string;
  areas_for_improvement?: string;
  would_recommend: boolean;
  next_session_interest: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'voice';
  file_url?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  therapist_id: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  session_id: string;
  client_id: string;
  therapist_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'crisis_hotline' | 'emergency_services' | 'therapist' | 'family';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Therapist Favorites Service
export class TherapistFavoritesService {
  static async addFavorite(clientId: string, therapistId: string): Promise<TherapistFavorite> {
    const { data, error } = await supabase
      .from('therapist_favorites')
      .insert({
        client_id: clientId,
        therapist_id: therapistId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async removeFavorite(clientId: string, therapistId: string): Promise<void> {
    const { error } = await supabase
      .from('therapist_favorites')
      .delete()
      .eq('client_id', clientId)
      .eq('therapist_id', therapistId);

    if (error) throw error;
  }

  static async getFavorites(clientId: string): Promise<TherapistFavorite[]> {
    const { data, error } = await supabase
      .from('therapist_favorites')
      .select('*')
      .eq('client_id', clientId);

    if (error) throw error;
    return data || [];
  }

  static async getFavoriteCount(clientId: string): Promise<number> {
    const { count, error } = await supabase
      .from('therapist_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (error) throw error;
    return count || 0;
  }

  static async isFavorite(clientId: string, therapistId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('therapist_favorites')
      .select('id')
      .eq('client_id', clientId)
      .eq('therapist_id', therapistId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
}

// Session Feedback Service
export class SessionFeedbackService {
  static async createFeedback(feedback: Omit<SessionFeedback, 'id' | 'created_at' | 'updated_at'>): Promise<SessionFeedback> {
    const { data, error } = await supabase
      .from('session_feedback')
      .insert(feedback)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getFeedbackBySession(sessionId: string): Promise<SessionFeedback | null> {
    const { data, error } = await supabase
      .from('session_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getFeedbackByTherapist(therapistId: string): Promise<SessionFeedback[]> {
    const { data, error } = await supabase
      .from('session_feedback')
      .select('*')
      .eq('therapist_id', therapistId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getFeedbackByClient(clientId: string): Promise<SessionFeedback[]> {
    const { data, error } = await supabase
      .from('session_feedback')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getAverageRating(therapistId: string): Promise<number> {
    const { data, error } = await supabase
      .from('session_feedback')
      .select('rating')
      .eq('therapist_id', therapistId);

    if (error) throw error;
    
    if (!data || data.length === 0) return 0;
    
    const sum = data.reduce((acc, feedback) => acc + feedback.rating, 0);
    return sum / data.length;
  }
}

// Notifications Service
export class NotificationsService {
  static async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  }

  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
  }
}

// Messages Service
export class MessagesService {
  static async createConversation(clientId: string, therapistId: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        client_id: clientId,
        therapist_id: therapistId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getConversation(clientId: string, therapistId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .eq('therapist_id', therapistId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`client_id.eq.${userId},therapist_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async sendMessage(message: Omit<Message, 'id' | 'created_at' | 'updated_at'>): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', message.conversation_id);

    return data;
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async markAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) throw error;
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  }
}

// Payments Service
export class PaymentsService {
  static async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getPayments(userId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .or(`client_id.eq.${userId},therapist_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getPaymentBySession(sessionId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updatePaymentStatus(paymentId: string, status: Payment['status']): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentId);

    if (error) throw error;
  }
}

// Emergency Contacts Service
export class EmergencyContactsService {
  static async getActiveContacts(): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('is_active', true)
      .order('type', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getContactsByType(type: EmergencyContact['type']): Promise<EmergencyContact[]> {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('type', type)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }
}
