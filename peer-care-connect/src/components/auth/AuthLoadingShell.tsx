interface AuthLoadingShellProps {
  message?: string;
  compact?: boolean;
}

/** Non-blocking shell states during session/profile resolution. */
export function AuthLoadingShell({ message = 'Loading…', compact }: AuthLoadingShellProps) {
  return (
    <div
      className={
        compact
          ? 'flex items-center justify-center gap-2 py-12'
          : 'min-h-screen bg-background flex items-center justify-center'
      }
    >
      <div className={compact ? 'flex items-center gap-3' : 'text-center'}>
        <div
          className={
            compact
              ? 'animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent'
              : 'animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3'
          }
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function SessionStuckShell({
  onRetry,
  onSignIn,
  secondaryLabel = 'Sign in',
}: {
  onRetry: () => void;
  onSignIn: () => void;
  secondaryLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold mb-2">Connection slow</h2>
        <p className="text-sm text-muted-foreground mb-4">
          We could not restore your session. Check your network or sign in again.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
          <button type="button" onClick={onSignIn} className="px-4 py-2 text-sm border rounded-md">
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
