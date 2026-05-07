# 3 Batti

A complete color/number betting game platform with a React Native mobile app, React admin panel, and Express backend.

## Run & Operate

- API Server workflow: `PORT=8080 pnpm --filter @workspace/api-server run dev`
- Admin Panel workflow: `PORT=8081 BASE_PATH=/ pnpm --filter @workspace/admin-panel run dev`
- Mobile App workflow: `cd artifacts/mobile && node_modules/.bin/expo start --localhost --port 20130`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Neon PostgreSQL connection string
- Required env: `SESSION_SECRET` — JWT secret for auth tokens

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, port 8080
- DB: Neon PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo (React Native) with Expo Router, port 20130
- Admin Panel: React + Vite, port 8081

## Where things live

- `artifacts/api-server/src/routes/` — all backend routes (auth, user, game, payment, referral, admin)
- `artifacts/api-server/src/db/schema/` — all 11 DB schema files
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `artifacts/admin-panel/src/` — React admin panel (12 pages)
- `artifacts/mobile/app/` — Expo mobile screens
- `artifacts/mobile/contexts/AuthContext.tsx` — mobile auth with AsyncStorage
- `artifacts/mobile/constants/colors.ts` — luxury gold/dark design tokens

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → both admin panel and mobile use generated hooks
- JWT auth via SESSION_SECRET env; bcryptjs for passwords; separate admin JWT role
- Game schedule is calculated from UTC+5:30 (IST) at 9AM, 1PM, 5PM, 9PM — no cron needed, computed on-demand
- Admin panel is a pure static Vite build (no SSR) suitable for deployment to Hostinger shared hosting or Render
- Mobile auth token stored in AsyncStorage; passed to API via `setAuthTokenGetter`

## Product

**Game**: Players bet on a color (Red/Yellow/Green, 2x payout) or number (0-9, 9x payout) before each round. 4 rounds per day at 9AM, 1PM, 5PM, 9PM IST. Admin declares results manually.

**Mobile App Screens**:
- Login/Register: Animated pulsing traffic lights, gold luxury theme, animated banner with stats
- Home: Linear gradient hero banner, gold countdown timer, luxury color buttons, gold number grid
- Bets: Luxury bet cards with gradient color indicators, win/loss badges
- Wallet: Gold balance card, QR code display from admin-uploaded QR, deposit/withdraw forms
- Profile: Gold avatar, luxury referral card, bank details form

**Design System** (Luxury Gold + Dark):
- Background: `#0A0C10`
- Primary Gold: `#D4AF37` (gradient to `#A07820`)
- Cards: `#12151E`
- Border: `#242840`
- Red: `#E53935`, Yellow: `#FBC02D`, Green: `#43A047`

**Admin Panel Pages** (12 total):
- Dashboard, Users, User Detail, Deposits, Withdrawals, Games, Live Bets, UPI Settings, Referrals, Analytics, Game Settings, Audit Logs
- UPI Settings: QR upload from gallery (select image file → auto-converts to base64 → stores in DB → displays in mobile app deposit screen)

## Admin Credentials

- Username: `Anuj Bishnoi`
- Password: `Anujbishnoi@#000#@`

## Game Schedule (IST)

- 9:00 AM, 1:00 PM, 5:00 PM, 9:00 PM

## Deployment on Render

### API Server (Backend)
1. Create a new **Web Service** on Render
2. Connect your GitHub repo
3. Build command: `pnpm install && pnpm --filter @workspace/api-server run build`
4. Start command: `pnpm --filter @workspace/api-server run start`
5. Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `PORT` (Render sets this automatically), `NODE_ENV=production`

### Admin Panel (Static Site)
1. Create a new **Static Site** on Render (or upload dist to Hostinger)
2. Build command: `pnpm install && BASE_PATH=/ pnpm --filter @workspace/admin-panel run build`
3. Publish directory: `artifacts/admin-panel/dist/public`
4. After deploy, update `EXPO_PUBLIC_API_BASE_URL` in mobile app to point to API server URL

### Mobile App APK (Android Build)
Run these commands in the Replit shell:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build APK (development/preview)
cd artifacts/mobile
eas build --profile preview --platform android

# Or build a production APK
eas build --profile production --platform android
```
- Requires an Expo account (free at expo.dev)
- APK builds in Expo's cloud, download link provided when done
- For local builds: `eas build --local --platform android` (requires Android SDK)

## User preferences

- Luxury gold/dark theme: Gold (#D4AF37), Red (#E53935), Yellow (#FBC02D), Green (#43A047)
- Dark background (#0A0C10 mobile), gold accents throughout
- Admin panel to be deployed to Hostinger as static dist/public folder, or Render Static Site

## Gotchas

- Always run codegen after changing openapi.yaml: `pnpm --filter @workspace/api-spec run codegen`
- lib/api-zod/src/index.ts must only contain `export * from "./generated/api";` — nothing else
- Do NOT run `pnpm dev` at workspace root — use workflow restart instead
- Expo uses absolute URLs (EXPO_PUBLIC_DOMAIN) since it runs outside the web proxy
- setBaseUrl is called at module level in _layout.tsx (not inside a component)
- QR codes are stored as base64 data URLs in the database qrImageUrl column (no file storage needed)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
