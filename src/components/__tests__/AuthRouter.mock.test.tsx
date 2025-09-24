import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import AuthRouter from '@/components/auth/AuthRouter';

// Mock the AuthContext to simulate authenticated state
const mockAuthContext = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {}
  },
  userProfile: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'client',
    user_type: null
  },
  session: {
    access_token: 'mock-token',
    user: {
      id: 'test-user-id',
      email: 'test@example.com'
    }
  },
  loading: false,
  profileLoading: false,
  signOut: jest.fn(),
  refreshUserProfile: jest.fn()
};

// Mock the AuthProvider
jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext
}));

const queryClient = new QueryClient();

// Mock navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('AuthRouter - mock authenticated users', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('allows authenticated client to access client dashboard', async () => {
    // Set up mock for client user
    mockAuthContext.userProfile.role = 'client';
    mockAuthContext.userProfile.user_type = null;

    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider>
          <MemoryRouter initialEntries={["/client/dashboard"]}>
            <Routes>
              <Route path="/client/dashboard" element={
                <AuthRouter>
                  <div data-testid="client-dashboard">Client Dashboard</div>
                </AuthRouter>
              } />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </SubscriptionProvider>
      </QueryClientProvider>
    );

    // Wait for dashboard to render
    await waitFor(() => {
      expect(screen.getByTestId('client-dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should not redirect to login
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('allows authenticated osteopath to access practitioner dashboard', async () => {
    // Set up mock for osteopath user
    mockAuthContext.userProfile.role = 'practitioner';
    mockAuthContext.userProfile.user_type = 'osteopath';

    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider>
          <MemoryRouter initialEntries={["/practitioner/dashboard"]}>
            <Routes>
              <Route path="/practitioner/dashboard" element={
                <AuthRouter>
                  <div data-testid="practitioner-dashboard">Practitioner Dashboard</div>
                </AuthRouter>
              } />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </SubscriptionProvider>
      </QueryClientProvider>
    );

    // Wait for dashboard to render
    await waitFor(() => {
      expect(screen.getByTestId('practitioner-dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should not redirect to login
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('allows authenticated sports therapist to access practitioner dashboard', async () => {
    // Set up mock for sports therapist user
    mockAuthContext.userProfile.role = 'practitioner';
    mockAuthContext.userProfile.user_type = 'sports_therapist';

    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider>
          <MemoryRouter initialEntries={["/practitioner/dashboard"]}>
            <Routes>
              <Route path="/practitioner/dashboard" element={
                <AuthRouter>
                  <div data-testid="practitioner-dashboard">Practitioner Dashboard</div>
                </AuthRouter>
              } />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </SubscriptionProvider>
      </QueryClientProvider>
    );

    // Wait for dashboard to render
    await waitFor(() => {
      expect(screen.getByTestId('practitioner-dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should not redirect to login
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('allows authenticated massage therapist to access practitioner dashboard', async () => {
    // Set up mock for massage therapist user
    mockAuthContext.userProfile.role = 'practitioner';
    mockAuthContext.userProfile.user_type = 'massage_therapist';

    render(
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider>
          <MemoryRouter initialEntries={["/practitioner/dashboard"]}>
            <Routes>
              <Route path="/practitioner/dashboard" element={
                <AuthRouter>
                  <div data-testid="practitioner-dashboard">Practitioner Dashboard</div>
                </AuthRouter>
              } />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </SubscriptionProvider>
      </QueryClientProvider>
    );

    // Wait for dashboard to render
    await waitFor(() => {
      expect(screen.getByTestId('practitioner-dashboard')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should not redirect to login
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
