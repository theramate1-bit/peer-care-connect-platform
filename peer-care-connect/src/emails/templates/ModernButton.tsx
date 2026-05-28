import * as React from 'react';
import { Link } from '../primitives';
import { emailTheme } from '../theme';

interface ModernButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  color?: string;
  fullWidth?: boolean;
  icon?: string;
}

export const ModernButton = ({
  href,
  children,
  variant = 'primary',
  color = emailTheme.brand,
  fullWidth = false,
  icon,
}: ModernButtonProps) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const bg = isDanger ? emailTheme.dangerInk : isPrimary ? color : emailTheme.surface;
  const fg = isDanger || isPrimary ? '#ffffff' : emailTheme.ink;
  const borderColor = isDanger ? emailTheme.dangerInk : isPrimary ? color : emailTheme.border;

  return (
    <table
      cellPadding="0"
      cellSpacing="0"
      style={{
        width: fullWidth ? '100%' : 'auto',
        margin: '0 auto',
      }}
    >
      <tr>
        <td style={{ padding: '0', textAlign: 'center' }}>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              backgroundColor: bg,
              color: fg,
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
              border: `1px solid ${borderColor}`,
              maxWidth: '100%',
              width: fullWidth ? '100%' : 'auto',
              minWidth: fullWidth ? 'auto' : '120px',
            }}
          >
            {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}
            {children}
          </Link>
        </td>
      </tr>
    </table>
  );
};

export default ModernButton;
