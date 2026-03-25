# Golf for Good

A greenfield Next.js implementation of the PRD in `PRD Full Stack Training (1).pdf`. The app includes:

- Public landing page and charity directory
- Subscriber auth, dashboard, score entry, subscription lifecycle, donation controls, and proof upload
- Admin dashboard for users, draws, charities, winner verification, and analytics
- File-backed persistence in `data/store.json` with a structure ready to migrate to Supabase and Stripe later

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind utility styling with custom global design tokens
- Server Actions for mutations
- Cookie-based local sessions

## Local run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo credentials

- Admin: `admin@golfforgood.com` / `Admin123!`
- Subscriber: `maya@golfforgood.com` / `Maya123!`

## Notes

- Data persists locally in [data/store.json](/Users/balaji/Desktop/intern/data/store.json).
- Uploaded winner proof images are written to [public/uploads](/Users/balaji/Desktop/intern/public/uploads).
- The current implementation simulates subscription billing and draw publishing locally. To productionize it, replace the file store and session layer with Supabase, and wire checkout/webhooks into Stripe.
- Draw logic assumes the subscriber’s latest five Stableford scores act as their five-number draw entry. Matching counts are calculated against distinct score values.
