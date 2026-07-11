# Luminé Services Co. website

Static site deployed on Vercel, with a Vercel Function at `/api/contact` for booking-request email delivery through Resend.

## Local verification

```bash
npm test
```

## Required Vercel environment variables

- `RESEND_API_KEY`: API key from Bianca's Resend account.
- `CONTACT_FROM_EMAIL`: sender on a domain verified in Resend, for example `Luminé Website <bookings@luminellc.org>`.
- `CONTACT_TO_EMAIL`: booking recipient; defaults to `hello@luminellc.org` if omitted.

Set the variables for Production (and Preview if preview submissions should be tested), then redeploy. Never place the Resend API key in `index.html` or other browser-delivered code.

Before the production acceptance test, verify `luminellc.org` (or the chosen sending subdomain) in Resend using the exact DNS records shown in Bianca's Resend dashboard.

## Vercel project settings

This is not a Next.js application. Vercel should use:

- Framework Preset: `Other`
- Root Directory: repository root (`./`)
- Build Command: leave empty
- Output Directory: leave empty
- Install Command: automatic/default

The root `index.html` is served as the website and files under `api/` are deployed as Vercel Functions. No API key belongs in Git or client-side HTML.

## Deployment checklist

1. Confirm that booking submissions should be delivered to `hello@luminellc.org`.
2. In Resend, add and verify `luminellc.org` or a sending subdomain using the exact DNS records Resend provides.
3. Create a Resend API key with sending permission.
4. Add `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and `CONTACT_TO_EMAIL` in Vercel for Production. Add them to Preview too if preview form delivery will be tested.
5. Ensure the Vercel project is connected to `lumineservicesco/Vercel-624`, branch `main`. If Vercel still shows `Project Link not found`, reconnect the Git repository from the project owner account.
6. Push the prepared repository and wait for the Vercel deployment to finish.
7. Test missing required fields, a valid production submission, the received email contents, and the reply-to address.
8. Confirm that `https://luminellc.org` points to the successful production deployment.
