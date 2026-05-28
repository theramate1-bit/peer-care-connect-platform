import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthCallback from '@/components/auth/AuthCallback';

const queryClient = new QueryClient();

describe('AuthCallback', () => {
  it('renders processing UI without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  });
});
