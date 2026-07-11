const REQUIRED_FIELDS = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['address', 'Property address'],
];

const FIELD_LIMITS = {
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 40,
  address: 300,
  package: 200,
  preferredDate: 40,
  customQuote: 10,
  squareFeet: 40,
  situation: 2000,
  addOn: 200,
  notes: 3000,
  website: 200,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeSubmission(body) {
  return Object.fromEntries(
    Object.entries(FIELD_LIMITS).map(([field, maxLength]) => [
      field,
      clean(body?.[field], maxLength),
    ]),
  );
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function display(value) {
  return value || 'Not provided';
}

function buildEmail(submission) {
  const fields = [
    ['Name', `${submission.firstName} ${submission.lastName}`],
    ['Email', submission.email],
    ['Phone', submission.phone],
    ['Service location', submission.address],
    ['Package', submission.package],
    ['Preferred date', submission.preferredDate],
    ['Custom quote requested', submission.customQuote === 'yes' ? 'Yes' : 'No'],
    ['Property size', submission.squareFeet],
    ['Custom scope details', submission.situation],
    ['Selected add-on', submission.addOn],
    ['Additional notes', submission.notes],
  ];

  const text = fields
    .map(([label, value]) => `${label}: ${display(value)}`)
    .join('\n\n');

  const rows = fields
    .map(([label, value]) => `
      <tr>
        <th style="padding:8px 12px;text-align:left;vertical-align:top;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</th>
        <td style="padding:8px 12px;white-space:pre-wrap;border-bottom:1px solid #e5e7eb;">${escapeHtml(display(value))}</td>
      </tr>`)
    .join('');

  return {
    subject: `New booking request from ${submission.firstName} ${submission.lastName}`,
    text,
    html: `<h2>New Luminé booking request</h2><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${rows}</table>`,
  };
}

export async function handleContact(request, env = process.env, send = fetch) {
  if (request.method !== 'POST') {
    return json({ ok: false, message: 'Method not allowed.' }, 405);
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return json({ ok: false, message: 'Please submit the form again.' }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Please submit the form again.' }, 400);
  }

  const submission = normalizeSubmission(body);

  // Quietly accept bot submissions caught by the hidden honeypot field.
  if (submission.website) {
    return json({ ok: true });
  }

  const missing = REQUIRED_FIELDS
    .filter(([field]) => !submission[field])
    .map(([, label]) => label);

  if (missing.length > 0) {
    return json(
      {
        ok: false,
        message: `Please complete: ${missing.join(', ')}.`,
        fields: REQUIRED_FIELDS
          .filter(([field]) => !submission[field])
          .map(([field]) => field),
      },
      400,
    );
  }

  if (!EMAIL_PATTERN.test(submission.email)) {
    return json(
      { ok: false, message: 'Please enter a valid email address.', fields: ['email'] },
      400,
    );
  }

  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO_EMAIL || 'hello@luminellc.org';
  const from = env.CONTACT_FROM_EMAIL;

  if (!apiKey || !from) {
    console.error('Contact form email settings are incomplete.');
    return json(
      {
        ok: false,
        message: 'We could not send your request right now. Please email hello@luminellc.org.',
      },
      503,
    );
  }

  const email = buildEmail(submission);
  let resendResponse;

  try {
    resendResponse = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'LumineServicesContactForm/1.0',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: submission.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
  } catch (error) {
    console.error('Resend request failed.', error);
    return json(
      {
        ok: false,
        message: 'We could not send your request right now. Please email hello@luminellc.org.',
      },
      502,
    );
  }

  if (!resendResponse.ok) {
    const details = await resendResponse.text();
    console.error(`Resend returned ${resendResponse.status}: ${details}`);
    return json(
      {
        ok: false,
        message: 'We could not send your request right now. Please email hello@luminellc.org.',
      },
      502,
    );
  }

  const result = await resendResponse.json();
  return json({ ok: true, id: result.id });
}

export default {
  fetch(request) {
    return handleContact(request);
  },
};
