import 'dotenv/config';
import crypto from 'node:crypto';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error('CLERK_WEBHOOK_SECRET is missing');
}

const payload = JSON.stringify({
  type: 'user.created',
  data: {
    id: 'user_test_postman_123',
    first_name: 'Postman',
    last_name: 'Test',
    email_addresses: [
      {
        email_address: 'postman-test@example.com'
      }
    ]
  }
});

const svixId = crypto.randomUUID();
const svixTimestamp = Math.floor(Date.now() / 1000);

const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

const secretBytes = Buffer.from(
  webhookSecret.replace(/^whsec_/, ''),
  'base64'
);

const signature = crypto
  .createHmac('sha256', secretBytes)
  .update(signedContent)
  .digest('base64');

const response = await fetch(
  'https://surcharge-unseemly-shingle.ngrok-free.dev/webhooks/clerk',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'svix-id': svixId,
      'svix-timestamp': String(svixTimestamp),
      'svix-signature': `v1,${signature}`,
      'ngrok-skip-browser-warning': 'true'
    },
    body: payload
  }
);

console.log('Status:', response.status);
console.log('Response:', await response.text());