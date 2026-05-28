/**
 * Test Database Helpers
 * Utilities for managing test database state (cleanup, seeding, etc.)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { MockDataFactory, MockUser, MockBooking, MockService } from './mock-factories';

export class TestDatabaseHelpers {
  /**
   * Clean up test data from database
   * Note: In real tests, you'd use a test database or transactions
   */
  static async cleanupTestData(
    client: SupabaseClient,
    userIds: string[] = [],
    bookingIds: string[] = [],
    serviceIds: string[] = []
  ): Promise<void> {
    // Delete bookings
    if (bookingIds.length > 0) {
      await client
        .from('session_bookings')
        .delete()
        .in('id', bookingIds);
    }

    // Delete services
    if (serviceIds.length > 0) {
      await client
        .from('practitioner_services')
        .delete()
        .in('id', serviceIds);
    }

    // Delete users (be careful with this in real tests)
    if (userIds.length > 0) {
      await client
        .from('users')
        .delete()
        .in('id', userIds);
    }
  }

  /**
   * Seed test data into database
   */
  static async seedTestData(
    client: SupabaseClient,
    options: {
      users?: Partial<MockUser>[];
      bookings?: Partial<MockBooking>[];
      services?: Partial<MockService>[];
    } = {}
  ): Promise<{
    users: MockUser[];
    bookings: MockBooking[];
    services: MockService[];
  }> {
    const users: MockUser[] = [];
    const bookings: MockBooking[] = [];
    const services: MockService[] = [];

    // Seed users
    if (options.users) {
      for (const userData of options.users) {
        const user = MockDataFactory.createUser(userData);
        const { data, error } = await client
          .from('users')
          .insert(user)
          .select()
          .single();

        if (!error && data) {
          users.push(data as MockUser);
        }
      }
    }

    // Seed services (requires practitioners)
    if (options.services) {
      for (const serviceData of options.services) {
        const service = MockDataFactory.createService(serviceData);
        const { data, error } = await client
          .from('practitioner_services')
          .insert(service)
          .select()
          .single();

        if (!error && data) {
          services.push(data as MockService);
        }
      }
    }

    // Seed bookings (requires users and services)
    if (options.bookings) {
      for (const bookingData of options.bookings) {
        const booking = MockDataFactory.createBooking(bookingData);
        const { data, error } = await client
          .from('session_bookings')
          .insert(booking)
          .select()
          .single();

        if (!error && data) {
          bookings.push(data as MockBooking);
        }
      }
    }

    return { users, bookings, services };
  }

  /**
   * Create a test user in the database
   */
  static async createTestUser(
    client: SupabaseClient,
    overrides: Partial<MockUser> = {}
  ): Promise<MockUser | null> {
    const user = MockDataFactory.createUser(overrides);
    const { data, error } = await client
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) {
      console.error('Error creating test user:', error);
      return null;
    }

    return data as MockUser;
  }

  /**
   * Create a test booking in the database
   */
  static async createTestBooking(
    client: SupabaseClient,
    overrides: Partial<MockBooking> = {}
  ): Promise<MockBooking | null> {
    const booking = MockDataFactory.createBooking(overrides);
    const { data, error } = await client
      .from('session_bookings')
      .insert(booking)
      .select()
      .single();

    if (error) {
      console.error('Error creating test booking:', error);
      return null;
    }

    return data as MockBooking;
  }

  /**
   * Get test user by ID
   */
  static async getTestUser(
    client: SupabaseClient,
    userId: string
  ): Promise<MockUser | null> {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as MockUser;
  }

  /**
   * Get test booking by ID
   */
  static async getTestBooking(
    client: SupabaseClient,
    bookingId: string
  ): Promise<MockBooking | null> {
    const { data, error } = await client
      .from('session_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as MockBooking;
  }

  /**
   * Mock Supabase response helper
   */
  static mockResponse<T>(data: T | null, error: any = null) {
    return { data, error };
  }

  /**
   * Mock Supabase error response
   */
  static mockError(message: string, code: string = 'PGRST_ERROR') {
    return {
      data: null,
      error: {
        message,
        code,
        details: null,
        hint: null,
      },
    };
  }
}

