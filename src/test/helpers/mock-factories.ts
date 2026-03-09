/**
 * Mock Data Factories
 * Generate test data for users, bookings, sessions, etc.
 */

export interface MockUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_role: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath';
  onboarding_status: 'pending' | 'in_progress' | 'completed';
  profile_completed: boolean;
  is_verified: boolean;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MockBooking {
  id: string;
  client_id: string;
  practitioner_id: string;
  service_id: string;
  session_date: string;
  session_duration_minutes: number;
  total_price_pence: number;
  platform_fee_pence: number;
  practitioner_earnings_pence: number;
  stripe_payment_intent_id?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  client_notes?: string;
  practitioner_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MockService {
  id: string;
  practitioner_id: string;
  service_name: string;
  service_type: string;
  duration_minutes: number;
  base_price_pence: number;
  is_active: boolean;
  stripe_product_id?: string;
  created_at: string;
}

export interface MockSession {
  id: string;
  booking_id: string;
  client_id: string;
  practitioner_id: string;
  session_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class MockDataFactory {
  /**
   * Generate a random UUID
   */
  static uuid(): string {
    return `test-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a random email
   */
  static email(): string {
    return `test-${Date.now()}@example.com`;
  }

  /**
   * Generate a random date in the future
   */
  static futureDate(daysAhead: number = 7): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString();
  }

  /**
   * Generate a random date in the past
   */
  static pastDate(daysAgo: number = 7): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  }

  /**
   * Create a mock user
   */
  static createUser(overrides: Partial<MockUser> = {}): MockUser {
    const roles: MockUser['user_role'][] = ['client', 'sports_therapist', 'massage_therapist', 'osteopath'];
    const role = overrides.user_role || roles[Math.floor(Math.random() * roles.length)];
    
    return {
      id: this.uuid(),
      email: this.email(),
      first_name: `Test${role === 'client' ? 'Client' : 'Practitioner'}`,
      last_name: 'User',
      user_role: role,
      onboarding_status: overrides.onboarding_status || 'completed',
      profile_completed: overrides.profile_completed ?? true,
      is_verified: overrides.is_verified ?? true,
      is_active: overrides.is_active ?? true,
      avatar_url: overrides.avatar_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a mock client user
   */
  static createClient(overrides: Partial<MockUser> = {}): MockUser {
    return this.createUser({
      user_role: 'client',
      ...overrides,
    });
  }

  /**
   * Create a mock practitioner user
   */
  static createPractitioner(
    role: 'sports_therapist' | 'massage_therapist' | 'osteopath' = 'sports_therapist',
    overrides: Partial<MockUser> = {}
  ): MockUser {
    return this.createUser({
      user_role: role,
      ...overrides,
    });
  }

  /**
   * Create a mock booking
   */
  static createBooking(overrides: Partial<MockBooking> = {}): MockBooking {
    const clientId = overrides.client_id || this.uuid();
    const practitionerId = overrides.practitioner_id || this.uuid();
    const serviceId = overrides.service_id || this.uuid();
    const totalPrice = overrides.total_price_pence || 7000; // £70.00
    const platformFee = Math.round(totalPrice * 0.015); // 1.5%
    const practitionerEarnings = totalPrice - platformFee;

    return {
      id: this.uuid(),
      client_id: clientId,
      practitioner_id: practitionerId,
      service_id: serviceId,
      session_date: this.futureDate(7),
      session_duration_minutes: overrides.session_duration_minutes || 60,
      total_price_pence: totalPrice,
      platform_fee_pence: platformFee,
      practitioner_earnings_pence: practitionerEarnings,
      stripe_payment_intent_id: overrides.stripe_payment_intent_id || `pi_test_${this.uuid()}`,
      status: overrides.status || 'pending',
      client_notes: overrides.client_notes,
      practitioner_notes: overrides.practitioner_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a mock service
   */
  static createService(overrides: Partial<MockService> = {}): MockService {
    return {
      id: this.uuid(),
      practitioner_id: overrides.practitioner_id || this.uuid(),
      service_name: overrides.service_name || 'Sports Therapy Session',
      service_type: overrides.service_type || 'sports_therapy',
      duration_minutes: overrides.duration_minutes || 60,
      base_price_pence: overrides.base_price_pence || 7000,
      is_active: overrides.is_active ?? true,
      stripe_product_id: overrides.stripe_product_id || `prod_test_${this.uuid()}`,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a mock session
   */
  static createSession(overrides: Partial<MockSession> = {}): MockSession {
    return {
      id: this.uuid(),
      booking_id: overrides.booking_id || this.uuid(),
      client_id: overrides.client_id || this.uuid(),
      practitioner_id: overrides.practitioner_id || this.uuid(),
      session_date: this.futureDate(7),
      status: overrides.status || 'scheduled',
      notes: overrides.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Create multiple mock users
   */
  static createUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  /**
   * Create multiple mock bookings
   */
  static createBookings(count: number, overrides: Partial<MockBooking> = {}): MockBooking[] {
    return Array.from({ length: count }, () => this.createBooking(overrides));
  }

  /**
   * Create multiple mock services
   */
  static createServices(count: number, overrides: Partial<MockService> = {}): MockService[] {
    return Array.from({ length: count }, () => this.createService(overrides));
  }
}

