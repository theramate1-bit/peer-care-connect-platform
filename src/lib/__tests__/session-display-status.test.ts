import {
  getDisplaySessionStatus,
  isSuccessfulSessionPayment,
} from '@/lib/session-display-status';

describe('session display status normalization', () => {
  test('pending_payment + completed => confirmed', () => {
    expect(getDisplaySessionStatus({ status: 'pending_payment', payment_status: 'completed' })).toBe('confirmed');
  });

  test('pending_payment + paid => confirmed', () => {
    expect(getDisplaySessionStatus({ status: 'pending_payment', payment_status: 'paid' })).toBe('confirmed');
  });

  test('scheduled + completed => confirmed', () => {
    expect(getDisplaySessionStatus({ status: 'scheduled', payment_status: 'completed' })).toBe('confirmed');
  });

  test('scheduled + succeeded => confirmed', () => {
    expect(getDisplaySessionStatus({ status: 'scheduled', payment_status: 'succeeded' })).toBe('confirmed');
  });

  test('completed/cancelled/no_show/in_progress => unchanged', () => {
    expect(getDisplaySessionStatus({ status: 'completed', payment_status: 'paid' })).toBe('completed');
    expect(getDisplaySessionStatus({ status: 'cancelled', payment_status: 'paid' })).toBe('cancelled');
    expect(getDisplaySessionStatus({ status: 'no_show', payment_status: 'paid' })).toBe('no_show');
    expect(getDisplaySessionStatus({ status: 'in_progress', payment_status: 'paid' })).toBe('in_progress');
  });

  test('pending_payment + pending => unchanged', () => {
    expect(getDisplaySessionStatus({ status: 'pending_payment', payment_status: 'pending' })).toBe('pending_payment');
  });

  test('pending_approval + held/pending => unchanged', () => {
    expect(getDisplaySessionStatus({ status: 'pending_approval', payment_status: 'held' })).toBe('pending_approval');
    expect(getDisplaySessionStatus({ status: 'pending_approval', payment_status: 'pending' })).toBe('pending_approval');
  });

  test('successful payment helper accepts legacy succeeded', () => {
    expect(isSuccessfulSessionPayment('paid')).toBe(true);
    expect(isSuccessfulSessionPayment('completed')).toBe(true);
    expect(isSuccessfulSessionPayment('succeeded')).toBe(true);
    expect(isSuccessfulSessionPayment('pending')).toBe(false);
  });
});
