export type DisplaySessionStatus =
  | 'pending_payment'
  | 'pending_approval'
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'declined'
  | 'expired';

type RawSessionLike = {
  status?: string | null;
  payment_status?: string | null;
};

const SUCCESSFUL_PAYMENT_STATUSES = new Set(['paid', 'completed', 'succeeded']);
const TERMINAL_OR_BUSINESS_STATUSES = new Set([
  'completed',
  'cancelled',
  'no_show',
  'declined',
  'expired',
  'in_progress',
]);

const normalizeRawStatus = (status?: string | null): string => {
  if (!status) return 'scheduled';
  return status.toLowerCase().replace(/-/g, '_');
};

export function isSuccessfulSessionPayment(paymentStatus?: string | null): boolean {
  if (!paymentStatus) return false;
  return SUCCESSFUL_PAYMENT_STATUSES.has(paymentStatus.toLowerCase());
}

export function getDisplaySessionStatus(input: RawSessionLike): DisplaySessionStatus {
  const normalizedStatus = normalizeRawStatus(input.status);

  if (TERMINAL_OR_BUSINESS_STATUSES.has(normalizedStatus)) {
    return normalizedStatus as DisplaySessionStatus;
  }

  const hasSuccessfulPayment = isSuccessfulSessionPayment(input.payment_status);
  if (hasSuccessfulPayment && (normalizedStatus === 'pending_payment' || normalizedStatus === 'scheduled')) {
    return 'confirmed';
  }

  if (normalizedStatus === 'pending_approval') return 'pending_approval';
  if (normalizedStatus === 'pending_payment') return 'pending_payment';
  if (normalizedStatus === 'confirmed') return 'confirmed';
  if (normalizedStatus === 'scheduled') return 'scheduled';

  return 'scheduled';
}

export function getDisplaySessionStatusLabel(input: RawSessionLike): string {
  const displayStatus = getDisplaySessionStatus(input);
  return displayStatus
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

const PRACTITIONER_VISIBLE_SESSION_STATUSES = new Set<DisplaySessionStatus>([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
]);

export function isPractitionerSessionVisible(input: RawSessionLike): boolean {
  if (input.payment_status?.toLowerCase() === 'released') return false;
  return PRACTITIONER_VISIBLE_SESSION_STATUSES.has(getDisplaySessionStatus(input));
}

export function isClientSessionVisible(input: RawSessionLike): boolean {
  if (input.payment_status?.toLowerCase() === 'released') return false;
  return getDisplaySessionStatus(input) !== 'expired';
}
