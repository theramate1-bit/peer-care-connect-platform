import * as React from 'react';
import { Text } from '../primitives';
import { emailTheme } from '../theme';

interface LabeledDividerProps {
  label: string;
}

export const LabeledDivider = ({ label }: LabeledDividerProps) => (
  <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '16px 0' }}>
    <tr>
      <td style={{ width: '42%', borderTop: `1px solid ${emailTheme.border}` }} />
      <td style={{ padding: '0 12px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
        <Text style={{ margin: 0, fontSize: '12px', lineHeight: '16px', color: emailTheme.muted, fontWeight: 600 }}>
          {label}
        </Text>
      </td>
      <td style={{ width: '42%', borderTop: `1px solid ${emailTheme.border}` }} />
    </tr>
  </table>
);
