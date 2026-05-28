import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SimpleProtectedRoute } from '@/components/auth/SimpleProtectedRoute';

const queryClient = new QueryClient();

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter>{children}</BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('SimpleProtectedRoute', () => {
  it('renders children when unauthenticated (AuthRouter handles redirects)', () => {
    render(
      <Wrapper>
        <SimpleProtectedRoute>
          <div>Protected content</div>
        </SimpleProtectedRoute>
      </Wrapper>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
