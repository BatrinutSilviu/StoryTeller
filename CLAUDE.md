# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Build for production (runs swagger generation first)
npm run lint       # Run ESLint
npm run start      # Start production server
```

The `prebuild` script automatically runs `scripts/generate-swagger.ts` to regenerate `public/swagger.json` from JSDoc comments in route files. Run this manually if swagger docs get out of sync:
```bash
node ./scripts/generate-swagger.ts
```

After schema changes, regenerate the Prisma client:
```bash
npx prisma generate
```

## Architecture

This is a **Next.js 16 API-only backend** (App Router). There is no meaningful frontend — `app/page.tsx` is a placeholder. The primary purpose is serving REST API endpoints backed by Supabase Auth + Prisma ORM.

### Key Infrastructure

- **Auth**: Supabase (`@supabase/ssr`) — JWT Bearer tokens in `Authorization` header. `lib/supabase-server.ts` creates a server client that reads the Bearer token from the request header.
- **Database**: PostgreSQL via Prisma ORM (`lib/prisma.ts`). Schema is in `prisma/schema.prisma`.
- **File Storage**: Cloudflare R2 via AWS S3 SDK (`lib/r2.ts`). File organization utilities in `lib/storage-utils.ts`.
- **API Docs**: Swagger UI at `/api-docs`, spec served from `/api/doc`, generated from JSDoc comments in route files.
- **CORS**: Configured in `next.config.ts` for `http://localhost:42071`.

### Auth Pattern

Two auth helpers in `lib/auth.ts`:
- `getAuthenticatedUser()` — validates any logged-in user
- `getAuthenticatedAdmin()` — validates user + checks `app_metadata.role === 'admin'`

All protected routes follow this pattern:
```ts
const { user, error: authError } = await getAuthenticatedAdmin()
if (authError) return authError
```

### Data Model

The schema is multi-language throughout. Core entities:

- **Stories** → **StoryTranslations** (one per language) → **StoryPages**
- **Categories** → **CategoryTranslations** (one per language)
- **Profiles** (linked to Supabase `user_id`) → **ProfileCategories**, **Playlists**, **Favorites**
- **Languages** — referenced by all translation models
- **PlaylistStories** — junction table with `order` field

### API Route Structure

Routes live in `app/api/` following Next.js App Router conventions. Each `route.ts` exports HTTP method handlers. All routes include JSDoc `@swagger` comments for documentation.

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DATABASE_URL
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```
