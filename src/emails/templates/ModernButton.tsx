import * as React from 'react';
import { Link } from '@react-email/components';

interface ModernButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  color?: string;
  fullWidth?: boolean;
  icon?: string;
}

export const ModernButton = ({
  href,
  children,
  variant = 'primary',
  color = '#059669',
  fullWidth = false,
  icon,
}: ModernButtonProps) => {
  const isPrimary = variant === 'primary';
  
  // Use table-based layout for better email client compatibility
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
        <td
          style={{
            padding: '0',
            textAlign: 'center',
          }}
        >
          <Link
            href={href}
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              backgroundColor: isPrimary ? color : 'rgba(255, 255, 255, 0.15)',
              color: isPrimary ? '#ffffff' : '#ffffff',
              textDecoration: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              textAlign: 'center',
              boxShadow: isPrimary
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: isPrimary ? `2px solid ${color === '#059669' ? '#047857' : color}` : '2px solid rgba(255, 255, 255, 0.3)',
              maxWidth: '100%',
              width: fullWidth ? '100%' : 'auto',
              minWidth: fullWidth ? 'auto' : '200px',
            }}
          >
            {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
            {children}
          </Link>
        </td>
      </tr>
    </table>
  );
};

export default ModernButton;
