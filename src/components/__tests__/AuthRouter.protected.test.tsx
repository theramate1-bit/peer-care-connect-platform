import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthRouter from '@/components/auth/AuthRouter';

const queryClient = new QueryClient();

describe('AuthRouter - protected routes', () => {
  it('redirects unauthenticated users from protected route to /login', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={["/client/dashboard"]}>
            <Routes>
              <Route path="/client/dashboard" element={
                <AuthRouter>
                  <div>Client Dashboard</div>
                </AuthRouter>
              } />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    const login = await screen.findByText('Login Page');
    expect(login).toBeInTheDocument();
  });
});




