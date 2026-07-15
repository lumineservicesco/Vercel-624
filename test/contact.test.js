import assert from 'node:assert/strict';
import test from 'node:test';

import { handleContact } from '../api/contact.js';

const validSubmission = {
  firstName: 'Bianca',
  lastName: 'Buyer',
  email: 'bianca@example.com',
  phone: '770-555-0100',
  address: '123 Listing Lane, Covington, GA',
  package: 'Standard Turnover',
  preferredDate: '2026-07-15',
  customQuote: 'no',
  bedroomCount: '2 bedrooms',
  situation: '',
  addOn: 'Oven Deep Clean',
  notes: 'Gate code supplied by phone.',
  website: '',
};

function request(body, options = {}) {
  return new Request('https://luminellc.org/api/contact', {
    method: options.method || 'POST',
    headers: { 'Content-Type': options.contentType || 'application/json' },
    body: options.method === 'GET' ? undefined : JSON.stringify(body),
  });
}

const env = {
  RESEND_API_KEY: 're_test',
  CONTACT_TO_EMAIL: 'hello@luminellc.org',
  CONTACT_FROM_EMAIL: 'Luminé Website <bookings@luminellc.org>',
};

test('rejects missing required fields without contacting Resend', async () => {
  let called = false;
  const response = await handleContact(request({ ...validSubmission, phone: '' }), env, async () => {
    called = true;
  });

  assert.equal(response.status, 400);
  assert.equal(called, false);
  assert.deepEqual((await response.json()).fields, ['phone']);
});

test('rejects invalid email addresses', async () => {
  const response = await handleContact(
    request({ ...validSubmission, email: 'not-an-email' }),
    env,
    async () => new Response('{}'),
  );

  assert.equal(response.status, 400);
  assert.deepEqual((await response.json()).fields, ['email']);
});

test('returns a customer-safe error when email settings are missing', async () => {
  const response = await handleContact(request(validSubmission), {}, async () => {
    throw new Error('send should not be called');
  });

  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /hello@luminellc\.org/);
});

test('sends a validated booking through Resend', async () => {
  let outgoing;
  const response = await handleContact(request(validSubmission), env, async (url, options) => {
    outgoing = { url, options, body: JSON.parse(options.body) };
    return Response.json({ id: 'email_123' });
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, id: 'email_123' });
  assert.equal(outgoing.url, 'https://api.resend.com/emails');
  assert.equal(outgoing.body.to[0], 'hello@luminellc.org');
  assert.equal(outgoing.body.reply_to, 'bianca@example.com');
  assert.match(outgoing.body.text, /Bedroom count: 2 bedrooms/);
  assert.match(outgoing.body.text, /Gate code supplied by phone/);
  assert.equal(outgoing.options.headers.Authorization, 'Bearer re_test');
});

test('does not expose Resend errors to the customer', async () => {
  const response = await handleContact(
    request(validSubmission),
    env,
    async () => new Response('{"message":"invalid api key"}', { status: 401 }),
  );

  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.doesNotMatch(body.message, /api key/i);
});
