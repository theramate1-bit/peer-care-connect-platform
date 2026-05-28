import * as React from 'react';
import { Text } from '../primitives';
import { emailTheme } from '../theme';

export interface KeyValueItem {
  label: string;
  value: React.ReactNode;
}

interface KeyValueGridProps {
  items: KeyValueItem[];
}

/** Table-based key/value row (email-safe, GitHub-style labels) */
export const KeyValueGrid = ({ items }: KeyValueGridProps) => {
  const chunk = (arr: KeyValueItem[], size: number) => {
    const out: KeyValueItem[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  const rows = chunk(items, 3);

  return (
    <table cellPadding="0" cellSpacing="0" width="100%" role="presentation">
      {rows.map((row, ri) => (
        <tr key={ri}>
          {row.map((cell, ci) => (
            <td
              key={ci}
              style={{
                paddingBottom: '12px',
                paddingRight: ci < row.length - 1 ? '16px' : 0,
                verticalAlign: 'top',
                width: `${100 / Math.max(row.length, 1)}%`,
              }}
            >
              <Text
                style={{
                  margin: '0 0 2px 0',
                  fontSize: '11px',
                  lineHeight: '16px',
                  color: emailTheme.muted,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {cell.label}
              </Text>
              <Text style={{ margin: 0, fontSize: '15px', lineHeight: '20px', fontWeight: 700, color: emailTheme.ink }}>
                {cell.value}
              </Text>
            </td>
          ))}
        </tr>
      ))}
    </table>
  );
};
