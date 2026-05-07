# 3 Batti

A complete color/number betting game platform with a React Native mobile app, React admin panel, and Express backend.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Neon PostgreSQL connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: Neon PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo (React Native) with Expo Router
- Admin Panel: React + Vite (deployable to Hostinger as static build)

## Where things live

- `artifacts/api-server/src/routes/` — all backend routes (auth, user, game, payment, referral, admin)
- `artifacts/api-server/src/db/schema/` — all 11 DB schema files
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `artifacts/admin-panel/src/` — React admin panel (12 pages)
- `artifacts/mobile/app/` — Expo mobile screens
- `artifacts/mobile/contexts/AuthContext.tsx` — mobile auth with AsyncStorage

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → both admin panel and mobile use generated hooks
- JWT auth via SESSION_SECRET env; bcryptjs for passwords; separate admin JWT role
- Game schedule is calculated from UTC+5:30 (IST) at 9AM, 1PM, 5PM, 9PM — no cron needed, computed on-demand
- Admin panel is a pure static Vite build (no SSR) suitable for deployment to Hostinger shared hosting
- Mobile auth token stored in AsyncStorage; passed to API via `setAuthTokenGetter`

## Product

**Game**: Players bet on a color (Red/Yellow/Green, 2x payout) or number (0-9, 9x payout) before each round. 4 rounds per day at 9AM, 1PM, 5PM, 9PM IST. Admin declares results manually.

**Mobile App Screens**:
- Login/Register (MPIN-based, no passwords)
- Home: Live countdown timer, color betting (2x), number betting (9x), recent results
- Bets: Full bet history with won/lost/pending status
- Wallet: Balance, deposit (UPI + reference ID), withdrawal requests, transaction history
- Profile: User info, referral code sharing, bank/UPI details for withdrawals

**Admin Panel Pages** (12 total):
- Dashboard, Users, User Detail, Deposits, Withdrawals, Games, Live Bets, UPI Settings, Referrals, Analytics, Game Settings, Audit Logs

## Admin Credentials

- Username: `Anuj Bishnoi`
- Password: `Anujbishnoi@#000#@`

## Game Schedule (IST)

- 9:00 AM, 1:00 PM, 5:00 PM, 9:00 PM

## User preferences

- Traffic light theme: Red (#D32F2F), Yellow (#FBC02D), Green (#2E7D32)
- Dark navy background (#0D1117 mobile, #1A237E accents)
- Admin panel to be deployed to Hostinger as static dist/public folder

## Gotchas

- Always run codegen after changing openapi.yaml: `pnpm --filter @workspace/api-spec run codegen`
- lib/api-zod/src/index.ts must only contain `export * from "./generated/api";` — nothing else
- Do NOT run `pnpm dev` at workspace root — use workflow restart instead
- Expo uses absolute URLs (EXPO_PUBLIC_DOMAIN) since it runs outside the web proxy
- setBaseUrl is called at module level in _layout.tsx (not inside a component)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
