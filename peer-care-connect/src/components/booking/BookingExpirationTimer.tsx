/**
 * Booking reservation countdown timer (KAN-81).
 * Shows remaining time to complete payment; warns at 2 min and 1 min; calls onExpired when time runs out.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface BookingExpirationTimerProps {
  /** Expiry time as ISO string or timestamp (ms) */
  expiresAt: string | number;
  /** Called when the reservation has expired */
  onExpired: () => void;
  className?: string;
}

function getRemainingMs(expiresAt: string | number): number {
  const end = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  return Math.max(0, end - Date.now());
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function BookingExpirationTimer({
  expiresAt,
  onExpired,
  className,
}: BookingExpirationTimerProps): React.ReactElement | null {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(expiresAt));
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const onExpiredRef = useRef(onExpired);
  const expiredFiredRef = useRef(false);
  onExpiredRef.current = onExpired;

  const tick = useCallback(() => {
    const ms = getRemainingMs(expiresAt);
    setRemainingMs(ms);
    if (ms <= 0 && !expiredFiredRef.current) {
      expiredFiredRef.current = true;
      onExpiredRef.current();
    }
  }, [expiresAt]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // Screen reader: announce at 2 min, 1 min, and when expired
  useEffect(() => {
    const sec = Math.floor(remainingMs / 1000);
    if (sec <= 0) {
      setAnnouncement('Your booking reservation has expired. Please select a new time slot.');
    } else if (sec === 120) {
      setAnnouncement('2 minutes remaining to complete your booking.');
    } else if (sec === 60) {
      setAnnouncement('1 minute remaining to complete your booking.');
    }
  }, [remainingMs]);

  // Clear announcement after a short delay so SR can read it once
  useEffect(() => {
    if (!announcement) return;
    const t = setTimeout(() => setAnnouncement(null), 2000);
    return () => clearTimeout(t);
  }, [announcement]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const isExpired = totalSeconds <= 0;
  const isUrgent = totalSeconds > 0 && totalSeconds <= 60;
  const isWarning = totalSeconds > 60 && totalSeconds <= 120;

  if (isExpired) {
    return (
      <Alert variant="destructive" className={cn('rounded-lg', className)} role="alert">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Reservation expired</AlertTitle>
        <AlertDescription>
          Your booking reservation has expired. Please select a new time slot.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Live region for screen readers */}
      {announcement && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic
          className="sr-only"
        >
          {announcement}
        </div>
      )}

      {isUrgent && (
        <Alert variant="destructive" className="rounded-lg" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Less than 1 minute left</AlertTitle>
          <AlertDescription>
            Complete payment soon or you will need to select a new time slot.
          </AlertDescription>
        </Alert>
      )}

      {isWarning && !isUrgent && (
        <Alert className="rounded-lg border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-500/50">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>2 minutes remaining</AlertTitle>
          <AlertDescription>
            Your reservation is held for a limited time. Please complete payment soon.
          </AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
          isUrgent && 'border-destructive/50 bg-destructive/5',
          isWarning && !isUrgent && 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20',
          !isWarning && !isUrgent && 'border-border bg-muted/50'
        )}
        aria-label={`Time remaining to complete booking: ${formatRemaining(remainingMs)}`}
      >
        <Timer className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="font-medium tabular-nums">
          {formatRemaining(remainingMs)} remaining
        </span>
      </div>
    </div>
  );
}
