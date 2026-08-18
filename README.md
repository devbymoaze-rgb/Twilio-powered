# TextPulse

AI-powered SMS automation for sales and support teams. Separate Next.js frontend and Express API, designed to deploy independently on Railway.

**Contact → message → AI understands → automation → response → qualification → human handoff → conversion.**

## Stack

- Frontend: Next.js 15, TypeScript, Tailwind
- Backend: Node.js, Express, TypeScript
- Database: MongoDB + Mongoose
- SMS: Twilio (credentials encrypted at rest, webhooks signature-checked)
- AI: OpenAI (server-side only)

## Local development

Create `backend/.env` from `backend/.env.example` and `frontend/.env.local` from `frontend/.env.example`.

```bash
# API
cd backend
npm install
npm run dev

# Web
cd frontend
npm install
npm run dev
```

Open the app at **http://127.0.0.1:3000** (use this exact address on Windows if WSL is installed — `localhost:3000` can hit another program).  
API: http://127.0.0.1:4000  
Health: http://127.0.0.1:4000/health

### Demo login (no Twilio required)

```
Email:    demo@textpulse.com
Password: Demo123456!
```

The API seeds this workspace on startup. Open `/login` and click **Enter demo dashboard**.

Generate a 32-byte hex encryption key for `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Railway (separate services)

Deploy **two** services from this GitHub repo. Do not deploy the repo root — each service needs its own Root Directory.

### 1. Push the code

Commit and push to GitHub, then in [Railway](https://railway.app) click **New Project → Deploy from GitHub repo**.

### 2. API service

1. Add a service from this repo.
2. Set **Root Directory** to `backend`.
3. Generate a public domain (**Settings → Networking → Generate domain**).
4. Add variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | long random string |
| `ENCRYPTION_KEY` | 64 hex characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `FRONTEND_URL` | `https://your-web.up.railway.app` (no trailing slash) |
| `PUBLIC_API_URL` | `https://your-api.up.railway.app` (no trailing slash) |
| `OPENAI_API_KEY` | your OpenAI key |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `COOKIE_SECURE` | `true` |

You can set `FRONTEND_URL` after the web service has a domain, then redeploy the API.

In the API service variables, turn **off** “Available at Build Time” for `JWT_SECRET`, `ENCRYPTION_KEY`, `OPENAI_API_KEY`, and `MONGODB_URI`. They are runtime secrets. Leave `NEXT_PUBLIC_API_URL` **on** for the web service — Next.js needs it during `npm run build`.

In MongoDB Atlas, allow Railway to connect: **Network Access → Add IP → `0.0.0.0/0`**.

Health check: `GET /health`

### 3. Web service

1. Add a **second** service from the same repo.
2. Set **Root Directory** to `frontend`.
3. Generate a public domain.
4. Add this variable **before the first successful build** (Next.js inlines it at build time):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-api.up.railway.app` (no trailing slash) |

5. Redeploy the web service after the variable is set.
6. Copy the web domain into the API’s `FRONTEND_URL` and redeploy the API.

### 4. Confirm

- Web: `https://your-web.up.railway.app`
- API health: `https://your-api.up.railway.app/health`
- Demo login: `demo@textpulse.com` / `Demo123456!`

Then connect Twilio in **Settings**. Selecting a number writes:

- `POST {PUBLIC_API_URL}/api/webhooks/twilio/inbound`
- `POST {PUBLIC_API_URL}/api/webhooks/twilio/status`

If the frontend domain changes later, add it to `CORS_ORIGINS` (comma-separated) or update `FRONTEND_URL`.

## Compliance

STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT opt a number out and add it to the suppression list. Automated and campaign sends are blocked for opted-out contacts. HELP and START are handled as first-class events.

## Tests

```bash
cd backend
npm test
npm run typecheck
```

```bash
cd frontend
npm run typecheck
```
