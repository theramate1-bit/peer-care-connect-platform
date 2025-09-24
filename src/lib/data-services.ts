/**
 * Centralized Data Services
 * 
 * This utility provides consistent data access patterns
 * for all database operations across the application.
 */

import { 
  fetchSingle, 
  fetchSingleOrNull, 
  fetchMultiple, 
  insertRecord, 
  upsertRecord, 
  updateRecord, 
  deleteRecord, 
  countRecords,
  callRPC,
  createSubscription
} from './api-utils';

// Type definitions for common entities
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'admin';
  onboarding_status: 'pending' | 'in_progress' | 'completed';
  phone?: string;
  profile_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_conditions?: string;
  medications?: string;
  allergies?: string;
  previous_therapy?: string;
  preferred_therapy_types?: string[];
  preferred_gender?: string;
  preferred_location?: string;
  preferred_time?: string;
  max_travel_distance?: number;
  primary_goal?: string;
  secondary_goals?: string[];
  timeline?: string;
  budget?: string;
  onboarding_completed: boolean;
  onboarding_date?: string;
  created_at: string;
  updated_at: string;
}

export interface TherapistProfile {
  id: string;
  user_id: string;
  bio?: string;
  location?: string;
  experience_years: number;
  specializations?: string[];
  qualifications?: string[];
  hourly_rate: number;
  availability?: any;
  professional_body?: string;
  registration_number?: string;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientSession {
  id: string;
  therapist_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'refunded';
  credit_cost?: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  therapist_id: string;
  project_name: string;
  project_description?: string;
  project_status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  estimated_cost?: number;
  actual_cost?: number;
  average_project_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  therapist_id: string;
  session_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * User Service
 */
export class UserService {
  static async getUserById(userId: string) {
    return fetchSingle<User>('users', { id: userId });
  }

  static async getUserByEmail(email: string) {
    return fetchSingleOrNull<User>('users', { email });
  }

  static async updateUser(userId: string, updates: Partial<User>) {
    return updateRecord<User>('users', { id: userId }, updates);
  }

  static async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    return insertRecord<User>('users', userData);
  }
}

/**
 * Client Profile Service
 */
export class ClientProfileService {
  static async getProfileByUserId(userId: string) {
    return fetchSingleOrNull<ClientProfile>('user_profiles', { user_id: userId });
  }

  static async getProfileById(profileId: string) {
    return fetchSingle<ClientProfile>('user_profiles', { id: profileId });
  }

  static async createProfile(profileData: Omit<ClientProfile, 'id' | 'created_at' | 'updated_at'>) {
    return insertRecord<ClientProfile>('user_profiles', profileData);
  }

  static async updateProfile(profileId: string, updates: Partial<ClientProfile>) {
    return updateRecord<ClientProfile>('user_profiles', { id: profileId }, updates);
  }

  static async upsertProfile(profileData: Partial<ClientProfile>) {
    return upsertRecord<ClientProfile>('user_profiles', profileData);
  }

  static async deleteProfile(profileId: string) {
    return deleteRecord('user_profiles', { id: profileId });
  }
}

/**
 * Therapist Profile Service
 */
export class TherapistProfileService {
  static async getProfileByUserId(userId: string) {
    return fetchSingleOrNull<TherapistProfile>('users', { user_id: userId });
  }

  static async getProfileById(profileId: string) {
    return fetchSingle<TherapistProfile>('users', { id: profileId });
  }

  static async getAllProfiles(filters: Record<string, any> = {}) {
    return fetchMultiple<TherapistProfile>('users', filters, '*', 
      { column: 'created_at', ascending: false });
  }

  static async createProfile(profileData: Omit<TherapistProfile, 'id' | 'created_at' | 'updated_at'>) {
    return insertRecord<TherapistProfile>('users', profileData);
  }

  static async updateProfile(profileId: string, updates: Partial<TherapistProfile>) {
    return updateRecord<TherapistProfile>('users', { id: profileId }, updates);
  }

  static async upsertProfile(profileData: Partial<TherapistProfile>) {
    return upsertRecord<TherapistProfile>('users', profileData);
  }

  static async deleteProfile(profileId: string) {
    return deleteRecord('users', { id: profileId });
  }
}

/**
 * Client Session Service
 */
export class ClientSessionService {
  static async getSessionsByTherapist(therapistId: string, filters: Record<string, any> = {}) {
    return fetchMultiple<ClientSession>('client_sessions', 
      { therapist_id: therapistId, ...filters }, 
      '*', 
      { column: 'session_date', ascending: false });
  }

  static async getSessionsByClient(clientEmail: string, filters: Record<string, any> = {}) {
    return fetchMultiple<ClientSession>('client_sessions', 
      { client_email: clientEmail, ...filters }, 
      '*', 
      { column: 'session_date', ascending: false });
  }

  static async getSessionById(sessionId: string) {
    return fetchSingle<ClientSession>('client_sessions', { id: sessionId });
  }

  static async createSession(sessionData: Omit<ClientSession, 'id' | 'created_at' | 'updated_at'>) {
    return insertRecord<ClientSession>('client_sessions', sessionData);
  }

  static async updateSession(sessionId: string, updates: Partial<ClientSession>) {
    return updateRecord<ClientSession>('client_sessions', { id: sessionId }, updates);
  }

  static async deleteSession(sessionId: string) {
    return deleteRecord('client_sessions', { id: sessionId });
  }

  static async getUpcomingSessions(therapistId: string) {
    const today = new Date().toISOString().split('T')[0];
    return fetchMultiple<ClientSession>('client_sessions', 
      { 
        therapist_id: therapistId, 
        session_date: { gte: today },
        status: 'scheduled'
      }, 
      '*', 
      { column: 'session_date', ascending: true });
  }

  static async getSessionStats(therapistId: string) {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    const [totalSessions, completedSessions, thisMonthSessions] = await Promise.all([
      countRecords('client_sessions', { therapist_id: therapistId }),
      countRecords('client_sessions', { therapist_id: therapistId, status: 'completed' }),
      countRecords('client_sessions', { 
        therapist_id: therapistId, 
        session_date: { gte: thisMonth.toISOString().split('T')[0] }
      })
    ]);

    return {
      total: totalSessions.data || 0,
      completed: completedSessions.data || 0,
      thisMonth: thisMonthSessions.data || 0
    };
  }
}

/**
 * Project Service
 */
export class ProjectService {
  static async getProjectsByClient(clientId: string) {
    return fetchMultiple<Project>('projects', 
      { client_id: clientId }, 
      '*', 
      { column: 'created_at', ascending: false });
  }

  static async getProjectsByTherapist(therapistId: string) {
    return fetchMultiple<Project>('projects', 
      { therapist_id: therapistId }, 
      '*', 
      { column: 'created_at', ascending: false });
  }

  static async getProjectById(projectId: string) {
    return fetchSingle<Project>('projects', { id: projectId });
  }

  static async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
    return insertRecord<Project>('projects', projectData);
  }

  static async updateProject(projectId: string, updates: Partial<Project>) {
    return updateRecord<Project>('projects', { id: projectId }, updates);
  }

  static async deleteProject(projectId: string) {
    return deleteRecord('projects', { id: projectId });
  }
}

/**
 * Notification Service
 */
export class NotificationService {
  static async getNotificationsByUser(userId: string) {
    return fetchMultiple<Notification>('notifications', 
      { user_id: userId }, 
      '*', 
      { column: 'created_at', ascending: false });
  }

  static async getUnreadNotifications(userId: string) {
    return fetchMultiple<Notification>('notifications', 
      { user_id: userId, read_at: null }, 
      '*', 
      { column: 'created_at', ascending: false });
  }

  static async getUnreadCount(userId: string) {
    return countRecords('notifications', { user_id: userId, read_at: null });
  }

  static async createNotification(notificationData: Omit<Notification, 'id' | 'created_at' | 'updated_at'>) {
    return insertRecord<Notification>('notifications', notificationData);
  }

  static async markAsRead(notificationId: string) {
    return updateRecord<Notification>('notifications', 
      { id: notificationId }, 
      { read_at: new Date().toISOString() });
  }

  static async markAllAsRead(userId: string) {
    return updateRecord<Notification>('notifications', 
      { user_id: userId, read_at: null }, 
      { read_at: new Date().toISOString() });
  }
}

/**
 * Payment Service
 */
export class PaymentService {
  static async getPaymentsByUser(userId: string) {
    return callRPC<Payment[]>('get_user_payments', { user_id: userId });
  }

  static async getPaymentsBySession(sessionId: string) {
    return fetchSingleOrNull<Payment>('payments', { session_id: sessionId });
  }

  static async createPayment(paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) {
    return insertRecord<Payment>('payments', paymentData);
  }

  static async updatePaymentStatus(paymentId: string, status: Payment['status']) {
    return updateRecord<Payment>('payments', { id: paymentId }, { status });
  }
}

/**
 * Analytics Service
 */
export class AnalyticsService {
  static async getPerformanceMetrics(userId: string) {
    return fetchSingleOrNull('performance_metrics', { user_id: userId });
  }

  static async getFinancialAnalytics(userId: string, timeRange: string) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return fetchSingleOrNull('financial_analytics', {
      user_id: userId,
      period_start: { gte: startDate.toISOString().split('T')[0] },
      period_end: { lte: endDate.toISOString().split('T')[0] }
    });
  }

  static async getEngagementAnalytics(userId: string) {
    return fetchSingleOrNull('engagement_analytics', { user_id: userId });
  }
}

/**
 * Real-time Services
 */
export class RealtimeService {
  static subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return createSubscription('notifications', { user_id: userId }, callback);
  }

  static subscribeToSessions(therapistId: string, callback: (payload: any) => void) {
    return createSubscription('client_sessions', { therapist_id: therapistId }, callback);
  }

  static subscribeToProjects(clientId: string, callback: (payload: any) => void) {
    return createSubscription('projects', { client_id: clientId }, callback);
  }
}

/**
 * Utility functions for common operations
 */
export const DataUtils = {
  /**
   * Get user profile with role-specific data
   */
  async getUserProfile(userId: string, userRole: string) {
    const user = await UserService.getUserById(userId);
    if (!user.data) return { user: null, profile: null };

    let profile = null;
    if (userRole === 'client') {
      profile = await ClientProfileService.getProfileByUserId(userId);
    } else {
      profile = await TherapistProfileService.getProfileByUserId(userId);
    }

    return {
      user: user.data,
      profile: profile?.data || null
    };
  },

  /**
   * Get dashboard data for a user
   */
  async getDashboardData(userId: string, userRole: string) {
    const { user, profile } = await this.getUserProfile(userId, userRole);
    
    if (!user || !profile) {
      return { user, profile, stats: null };
    }

    let stats = null;
    if (userRole === 'client') {
      // Get client-specific stats
      const projects = await ProjectService.getProjectsByClient(profile.id);
      stats = {
        activeProjects: projects.data?.filter(p => p.project_status === 'active').length || 0,
        completedProjects: projects.data?.filter(p => p.project_status === 'completed').length || 0,
        totalSpent: projects.data?.reduce((sum, p) => sum + (p.actual_cost || 0), 0) || 0
      };
    } else {
      // Get therapist-specific stats
      const sessionStats = await ClientSessionService.getSessionStats(userId);
      stats = {
        totalSessions: sessionStats.total,
        completedSessions: sessionStats.completed,
        thisMonthSessions: sessionStats.thisMonth
      };
    }

    return { user, profile, stats };
  }
};
