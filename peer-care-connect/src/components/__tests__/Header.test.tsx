import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

describe('Header', () => {
  it('renders brand name', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Header />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
    const matches = await screen.findAllByText(/TheraMate/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
