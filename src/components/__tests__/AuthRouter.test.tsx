import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthRouter from '@/components/auth/AuthRouter';

const queryClient = new QueryClient();

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

describe('AuthRouter', () => {
  it('allows access to public route and shows current path when unauthenticated', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/pricing"]}>
            <Routes>
              <Route
                path="/pricing"
                element={
                  <AuthRouter>
                    <LocationDisplay />
                  </AuthRouter>
                }
              />
              <Route path="/login" element={<div>Login</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const loc = await screen.findByTestId('location-display');
    expect(loc).toHaveTextContent('/pricing');
  });
});
