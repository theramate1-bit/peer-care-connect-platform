import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HybridBookingChooser } from './HybridBookingChooser';

describe.skip('HybridBookingChooser', () => {
  it('renders standard clinic and mobile actions', () => {
    render(
      <HybridBookingChooser
        onBookClinic={() => {}}
        onRequestMobile={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /book clinic session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request visit to my location/i })).toBeInTheDocument();
  });

  it('calls handlers when each action is clicked', async () => {
    const user = userEvent.setup();
    const onBookClinic = jest.fn();
    const onRequestMobile = jest.fn();

    render(
      <HybridBookingChooser
        onBookClinic={onBookClinic}
        onRequestMobile={onRequestMobile}
        practitionerName="Ray Dhillon"
      />
    );

    await user.click(screen.getByRole('button', { name: /book clinic session with ray dhillon/i }));
    await user.click(screen.getByRole('button', { name: /request visit to my location with ray dhillon/i }));

    expect(onBookClinic).toHaveBeenCalledTimes(1);
    expect(onRequestMobile).toHaveBeenCalledTimes(1);
  });
});

