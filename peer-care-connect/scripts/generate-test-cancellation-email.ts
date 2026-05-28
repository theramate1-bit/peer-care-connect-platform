/**
 * Generate test cancellation email HTML
 */

import { renderEmail } from '../src/emails/render';

const testData = {
  sessionType: 'Massage Therapy',
  sessionDate: '2025-02-15',
  sessionTime: '14:00',
  practitionerName: 'Jane Smith',
  cancellationReason: 'Practitioner unavailable due to emergency',
  refundAmount: 75,
};

const result = renderEmail({
  emailType: 'cancellation',
  recipientName: 'Rayman',
  recipientEmail: 'rayman196823@gmail.com',
  data: testData,
  baseUrl: 'https://theramate.co.uk',
});

console.log('Subject:', result.subject);
console.log('HTML Length:', result.html.length);
console.log('\n--- HTML Preview (first 500 chars) ---');
console.log(result.html.substring(0, 500));

// Write to file for inspection
import * as fs from 'fs';
fs.writeFileSync('test-cancellation-email.html', result.html);
console.log('\n✅ Full HTML saved to test-cancellation-email.html');

export { result };
