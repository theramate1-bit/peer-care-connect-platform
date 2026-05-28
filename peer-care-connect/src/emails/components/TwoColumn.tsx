import * as React from 'react';

interface TwoColumnProps {
  left: React.ReactNode;
  right: React.ReactNode;
  gap?: number;
}

export const TwoColumn = ({ left, right, gap = 16 }: TwoColumnProps) => (
  <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
    <tr>
      <td style={{ width: '50%', verticalAlign: 'top', paddingRight: `${gap / 2}px` }}>{left}</td>
      <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: `${gap / 2}px` }}>{right}</td>
    </tr>
  </table>
);
