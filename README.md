# Email Auto Machine

A MERN-stack web app that sends **personalized email campaigns from a spreadsheet**, with accounts, poster images, live sending progress, and full sending history.

> UI design is a faithful port of the `stitch_smart_email_automator` design files (Material 3 palette, Hanken Grotesk, Material Symbols, mobile-first bottom-nav shell).

## Features

- **Accounts** — sign up / log in with JWT; every user sees only their own lists, campaigns and settings (passwords hashed with bcrypt)
- **Home page** — a polished public landing page (hero, features, how-it-works, live stats) with the navbar at the bottom; the app is also fully usable as a website
- **Data Source** — upload `.csv` / `.xlsx` spreadsheets of contacts; see row counts and column previews
- **Compose** — subject + rich text body with formatting toolbar, **variable pills** (`{{Name}}`, `{{Email}}`, `{{Company}}`, … auto-generated from your spreadsheet columns), live preview, and an optional **poster image** embedded at the top of every email
- **Send** — one click sends personalized emails to every row (simulated or real SMTP)
- **Real-time** — Server-Sent Events stream live progress (progress ring, current recipient, sent/failed counters) and auto-refresh the history list the moment anything changes; pause/resume/cancel take effect instantly
- **Progress** — live circular progress ring, current recipient, sent/total/failed counters, Pause / Cancel controls
- **History** — searchable campaign list with status chips, filter chips, sent/fail rates with sparklines, and a per-recipient detail sheet
- **Settings** — SMTP server configuration (host, port, user, pass, SSL, from name/email), test-mode toggle, and connection test

## Stack

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Frontend | React 18 + Vite                                   |
| Backend  | Node.js + Express                                 |
| Database | MongoDB + Mongoose (**automatic in-memory fallback** if MongoDB isn't running) |
| Auth     | JWT (jsonwebtoken) + bcrypt                       |
| Email    | Nodemailer (SMTP)                                 |

## Quick start

```bash
# 1. Install everything
npm run install-all

# 2. Start both server + client together
npm run dev
```

Then open **http://localhost:5173**. Create an account on the Login page to start sending.

- Server API: http://localhost:5000
- The backend automatically uses MongoDB if one is reachable; otherwise it runs on a built-in memory store (data resets on restart). Set `MONGO_URI` in `server/.env` to point at your MongoDB or Atlas cluster.
- Set `JWT_SECRET` in `server/.env` to a strong secret for production.

## Deploying to Vercel

The repository includes a Vercel serverless entry at `api/index.js` and a root `vercel.json` that builds the Vite client and routes `/api/*` to Express. Import the repository into Vercel from its root folder, then add these Environment Variables for the Production environment:

- `MONGO_URI` — use a hosted MongoDB/Atlas connection string; the in-memory fallback is not persistent on Vercel.
- `JWT_SECRET` — use a long random production secret.
- `APP_URL` — your deployed Vercel URL.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` — required for password-reset and real email delivery.

After deployment, verify the backend at `https://<your-domain>/api/health`. It should return `{ "ok": true, "db": "mongo" }` when MongoDB is configured correctly.

## Sending real emails

1. Open the **Settings** tab (bottom nav).
2. Enter your SMTP details (e.g. Gmail: `smtp.gmail.com`, port `587`, your address + an App Password).
3. Turn **Test mode OFF** to send real emails.

While **Test mode** is ON (default), sending is simulated — every step works end to end, and rows whose email contains "invalid" simulate a bounce so you can see the failure path.

## Sample data

`sample_contacts.csv` is included at the project root — connect it in the Composer tab to try the flow.

## Project layout

```
server/            Express API
  routes/          uploads, campaigns, settings
  services/        email service, campaign runner, db
  store.js         unified data layer (MongoDB or in-memory)
client/            React + Vite app
  src/pages/       Composer, Progress, History, Settings
  src/components/  BottomNav
```
