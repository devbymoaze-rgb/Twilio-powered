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

Frontend: http://localhost:3000  
API: http://localhost:4000  
Health: http://localhost:4000/health

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

Deploy **two** Railway services from this repo.

### API service

- Root directory: `backend`
- Build: `npm install && npm run build`
- Start: `npm start`
- Variables: `MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `PUBLIC_API_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `COOKIE_SECURE=true`, `NODE_ENV=production`

`PUBLIC_API_URL` must be the public HTTPS origin of the API (used for Twilio webhook URLs).

### Web service

- Root directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npm start`
- Variables: `NEXT_PUBLIC_API_URL` = public API origin

After the API is live, connect Twilio in Settings. Selecting a number writes inbound + status callback URLs to:

- `POST {PUBLIC_API_URL}/api/webhooks/twilio/inbound`
- `POST {PUBLIC_API_URL}/api/webhooks/twilio/status`

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
