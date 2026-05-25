# PanchoEvents — Auth System

Private livestream event management platform with secure authentication, single-session enforcement, and a full admin panel.

## Stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** (PostgreSQL, free tier)
- **TailwindCSS** + custom design system
- **bcryptjs** (password hashing)
- **jose** (JWT signing/verification)

---

## 1 · Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role (secret)** key → `SUPABASE_SERVICE_KEY`

---

## 2 · Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...         # service_role key (server-side only)
JWT_SECRET=your-random-256bit-secret
ADMIN_SETUP_SECRET=your-setup-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

---

## 3 · Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 4 · Create First Admin

Once the app is running, hit the setup endpoint **once**:

```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "setupSecret": "your-setup-secret"
  }'
```

> **Important:** This endpoint auto-disables itself after the first admin is created. You do not need to remove it.

---

## 5 · Architecture

```
auth-system/
├── app/
│   ├── api/
│   │   ├── auth/login        POST  — Login (rate-limited, bcrypt, single-session)
│   │   ├── auth/logout       POST  — Logout + session deletion
│   │   ├── auth/me           GET   — Validate current session
│   │   ├── admin/setup       POST  — One-time admin creation
│   │   ├── admin/users       GET/POST
│   │   ├── admin/users/[id]  GET/PUT/DELETE
│   │   ├── admin/users/[id]/events  GET/POST — Assign events to user
│   │   ├── admin/events      GET/POST
│   │   ├── admin/events/[id] PUT/DELETE
│   │   ├── admin/logs        GET — Access logs (paginated)
│   │   └── events            GET — User's assigned events
│   ├── login/                Login page
│   ├── dashboard/            User dashboard + stream player
│   └── admin/                Admin panel (users, events, logs)
├── components/ui/            Button, Input, Modal, Badge, Toast
├── lib/
│   ├── auth.ts               JWT + session management
│   ├── supabase.ts           Server-side Supabase client
│   └── utils.ts              Helpers
├── middleware.ts              Route protection + role enforcement
├── supabase/schema.sql       Database schema
└── types/index.ts            TypeScript types
```

---

## 6 · Security Features

- **Single-session enforcement** — new login invalidates all previous sessions in DB
- **bcrypt** (cost 12) password hashing
- **HttpOnly + Secure + SameSite=Strict** cookies
- **JWT** signed with HS256, 24h expiry, validated against DB session on every request
- **Rate limiting** — max 10 failed login attempts per username per 15 minutes
- **Constant-time** password comparison (prevents timing attacks)
- **Role-based middleware** — admin routes return 401/redirect for non-admins
- **Account deactivation** instantly invalidates active session
- **Password change** forces re-login

---

## 7 · Deployment (Vercel)

```bash
npm run build   # verify build passes locally first
```

1. Push to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Deploy

The `SUPABASE_SERVICE_KEY` is server-only and never exposed to the browser.
