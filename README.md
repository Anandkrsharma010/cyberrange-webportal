# RangeOps — Frontend

**RangeOps by DeepTrustxAI Academy** — Next.js web client for hands-on cyber-range labs, purchases, workshop operations, and platform administration. It talks to the project’s FastAPI backend using **JWT** authentication and **role-based** navigation (`learner`, `course_admin`, `sys_admin`).

---

## Documentation

| Document | Description |
|----------|-------------|
| **[FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md)** | Full technical documentation: stack, architecture, routes, state, API integration, env vars, scripts, security, deployment, roadmap |

---

## Quick start

```bash
cd Frontend
npm install
# Create .env.local — see FRONTEND_DOCUMENTATION.md → Environment variables
npm run dev
```

Default dev URL: **http://127.0.0.1:18080** (`npm run dev:windows` uses port **3000**).

```bash
npm run build   # production build
npm run start   # run production server
npm run lint    # ESLint
```

---

## Tech at a glance

Next.js **15** (App Router) · React **19** · TypeScript · Tailwind **v4** · Radix UI · `fetch`-based API client (`lib/api.ts`) · Google SSO + Razorpay checkout (where configured).

---

## Screenshots (for GitHub)

Add images under `docs/screenshots/` (or `.github/`) and embed them in [FRONTEND_DOCUMENTATION.md](./FRONTEND_DOCUMENTATION.md#frontend-preview). Suggested captures: home, `/labs`, `/dashboard`, `/admin`, `/course-admin`, purchase flow, quiz page, mobile width.

---

## Repository note

The `package.json` **name** field may still show a placeholder; rename when publishing or open-sourcing. Backend setup lives outside this folder — see the monorepo **`Backend`** project and its README.
