import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.CLERK_WEBHOOK_SECRET;

if (!secret) {
  throw new Error('CLERK_WEBHOOK_SECRET is missing from .env');
}

const payload = JSON.stringify({
  type: 'user.created',
  data: {
    id: 'user_test_postman_123',
    first_name: 'Postman',
    last_name: 'Test',
    email_addresses: [
      {
        email_address: 'postman-test@example.com',
      },
    ],
  },
});

const msgId = `msg_${crypto.randomUUID()}`;
const timestamp = Math.floor(Date.now() / 1000);

const secretBytes = Buffer.from(
  secret.replace(/^whsec_/, ''),
  'base64'
);

const signedContent = `${msgId}.${timestamp}.${payload}`;

const signature = crypto
  .createHmac('sha256', secretBytes)
  .update(signedContent)
  .digest('base64');

console.log('\n========== POSTMAN WEBHOOK TEST ==========\n');

console.log('URL:');
console.log(
  'https://surcharge-unseemly-shingle.ngrok-free.dev/webhooks/clerk'
);

console.log('\nHeaders:\n');
console.log(`svix-id: ${msgId}`);
console.log(`svix-timestamp: ${timestamp}`);
console.log(`svix-signature: v1,${signature}`);
console.log('Content-Type: application/json');

console.log('\nBody:\n');
console.log(payload);

console.log('\n==========================================\n');