# Holiday Vibez CRM

Phase 1 (Foundation) scaffold, built from `Holiday_Vibez_CRM_Master_Build_Spec.docx`.

Covers: data model migrations, Auth/RBAC + session management, and the Admin module
(Users, Branches, Rate Cards). Later phases (Lead pipeline, Quotation Builder, Approval
workflow, Finance, Targets, Departure Calendar, PWA) are not built yet — see the spec's
Section 14 build phases.

## Structure

- `apps/api` — NestJS backend (PostgreSQL via Prisma)
- `apps/web` — Next.js frontend
- `packages/shared` — shared TypeScript types/enums used by both apps
- `infra` — local dev docker-compose (Postgres + Redis)

## Getting started

Requires Docker (or a local PostgreSQL + Redis) and Node 18+.

```bash
# 1. Start Postgres + Redis
docker compose -f infra/docker-compose.yml up -d

# 2. Install dependencies
npm install

# 3. Build the shared types package
npm run build:shared

# 4. Configure env vars
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 5. Run migrations + seed data
npm run migrate
npm run seed

# 6. Start both apps (two terminals)
npm run dev:api
npm run dev:web
```

Web runs at http://localhost:3000, API at http://localhost:4000/api.

## Seeded logins

All seeded users share the password `Password@123`:

- `director@holidayvibez.com` — Director
- `admin@holidayvibez.com` — Admin
- `manager.<branch>@holidayvibez.com` — Branch Manager (mumbai, delhi, bengaluru, pune, ahmedabad)
- `consultant1.<branch>@holidayvibez.com` / `consultant2.<branch>@holidayvibez.com` — Travel Consultant

## Permission matrix (Phase 1 scope)

| Role | Users | Branches | Rate Cards |
|---|---|---|---|
| Admin | full CRUD | full CRUD | full CRUD |
| Director | read-only | read-only | read-only |
| Branch Manager | no access | read-only | read-only |
| Travel Consultant | no access | read-only | read-only |

`POST /rates` and `PATCH /rates/:id` return 403 for any non-Admin role — enforces the
spec's "Enforced Admin-only price editing" requirement (Section 1.3 gap list).
