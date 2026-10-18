# SWEPack

SWEPack is a community-built library of software engineering resources. Browse and search curated tools, libraries, documentation, guides, courses, repositories, and communities; save useful finds into personal collections; and submit new resources for review.

The project is a monorepo with a Next.js web application and a NestJS REST API backed by PostgreSQL and Prisma.

## Features

- Browse a paginated resource library with search, categories, and sorting.
- Register and sign in with email and password.
- Submit resources for moderation and track your submissions.
- Save resources and organize them into private collections.
- Manage resource status, categories, and tags with an administrator account.
- Preview resource metadata during submission.
- Cache resource queries in the browser to make repeat visits and navigation faster.
- Optionally support password reset email when a mail provider is configured.

## Technology

| Area | Stack |
| --- | --- |
| Web | Next.js App Router, React, TypeScript, Tailwind CSS, TanStack Query |
| API | NestJS, TypeScript, REST, JWT authentication |
| Data | PostgreSQL, Prisma |
| Hosting | Frontend on Vercel; backend and database can be hosted separately |

## Repository layout

```text
.
├── backend/
│   ├── prisma/             # Prisma schema, migrations, and guarded seed scripts
│   └── src/                # NestJS modules, controllers, services, and tests
├── frontend/
│   └── src/                # Next.js routes, components, hooks, and API client
└── README.md
```

## Getting started

### Prerequisites

- Node.js 20.19 or newer (Node.js 22 LTS recommended).
- npm.
- A running PostgreSQL database for the API.

### 1. Configure the backend

In PowerShell, from the repository root:

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` and provide a PostgreSQL connection string and a strong JWT secret. For local development, set `FRONTEND_URL` to `http://localhost:3000`:

```dotenv
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/swepack?schema=public
JWT_SECRET=replace-with-a-random-secret-of-at-least-32-characters
PASSWORD_RESET_ENABLED=false
```

Use a URL-encoded password if it contains characters that have special meaning in a connection string. Keep real credentials in local environment files or your hosting provider's secret manager; do not commit them.

Install dependencies and prepare the local database:

```powershell
cd backend
npm ci
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts
```

`migrate dev` applies the checked-in migrations to your **development** database. Do not point it at production.

### 2. Configure the frontend

Open a second terminal at the repository root:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

Set the API URL in `frontend\.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PASSWORD_RESET_ENABLED=false
```

The password-reset setting should remain disabled unless the backend email configuration is complete.

### 3. Start both applications

Start the API in the first terminal:

```powershell
cd backend
npm run start:dev
```

Start the web application in the second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API listens on [http://localhost:3001](http://localhost:3001) by default; its health endpoint is `/health`.

### macOS and Linux

Use `cp backend/.env.example backend/.env` and `cp frontend/.env.example frontend/.env.local` to copy the example environment files. The `npm` and Prisma commands above are otherwise the same.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL used by Prisma. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs. Use a random value of at least 32 characters in production. |
| `FRONTEND_URL` | Yes | Exact allowed web origin for CORS, such as `http://localhost:3000`. Production must use HTTPS. |
| `PORT` | No | API listening port; defaults to `3001`. |
| `NODE_ENV` | No | Set to `production` in production deployments. |
| `PASSWORD_RESET_ENABLED` | No | Set to `true` to enable the API's password-reset flow after email is configured; defaults to disabled. |
| `RESEND_API` | For password reset | Resend API key used to send password-reset email. |
| `EMAIL_FROM` | For password reset | Verified sender address used by Resend. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes for production | Base URL of the backend API, without an endpoint path. Local development defaults to `http://localhost:3001`. Production builds require an HTTPS URL. |
| `NEXT_PUBLIC_PASSWORD_RESET_ENABLED` | No | Set to `true` to expose password-reset UI. Keep this consistent with the backend setting. |

`NEXT_PUBLIC_*` values are included in browser-facing code. Never put secrets in frontend environment variables.

## Useful commands

Run commands from the relevant application directory.

### Backend

```powershell
npm run start:dev       # Start NestJS with watch mode
npm run build           # Compile the API
npm run start:prod      # Run the compiled API
npm test -- --runInBand # Run unit tests
npm run test:e2e        # Run end-to-end tests
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
```

### Frontend

```powershell
npm run dev                    # Start Next.js locally
npm run build                  # Create a production build
npm run start                  # Serve the production build
npm run lint                   # Run ESLint
npm run lint -- src/path/file.tsx # Lint a specific file
```

## API overview

The backend exposes a REST API. Authenticated routes require a valid JWT; administrative routes additionally require the `ADMIN` role.

| Area | Routes |
| --- | --- |
| Health | `GET /health` |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Password reset | `POST /auth/forgot-password`, `POST /auth/reset-password` (when enabled) |
| Resources | `GET /resources`, `GET /resources/:id`, `POST /resources`, `POST /resources/metadata`, `GET /resources/mine`, `GET /resources/saved` |
| Resource actions | `POST /resources/:id/save`, `DELETE /resources/:id/save`, `PATCH /resources/:id`, `DELETE /resources/:id` |
| Resource moderation | `GET /resources/admin`, `GET /resources/admin/summary`, `PATCH /resources/:id/status` (admin) |
| Taxonomy | `GET /categories`, `GET /tags`; create, update, and delete require admin access |
| Collections | `/collections` and `/collections/:id/resources` (authenticated, user-owned) |

For request fields and response shapes, refer to the DTOs and controllers in `backend/src`.

## Database and seed scripts

Prisma schema and migration files live in `backend/prisma`. Prisma CLI commands use `backend/prisma7.config.ts`.

The scripts `npm run seed:production` and `npm run bootstrap:admin` are deliberately guarded for the Railway production database. They require `SEED_TARGET=railway-production` and validate that the configured database URL points to Railway. Do not weaken those checks or run them against an unintended database.

The admin bootstrap requires `DATABASE_URL`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. It creates or updates the account with the supplied email, assigning the `ADMIN` role and setting the supplied password. Treat it as a credential-changing production operation; use a secure terminal and never place credentials in source control or chat.

## Deployment

- **Frontend:** Deploy the `frontend` directory as the Vercel project root. Set `NEXT_PUBLIC_API_URL` to the HTTPS production API URL and set the password-reset flag according to the backend configuration.
- **Backend:** Deploy the `backend` directory to a Node.js host. Configure the backend environment variables in the host's secret settings, build with `npm run build`, and start with `npm run start:prod`.
- **Database:** Apply committed migrations to the intended database with `npx prisma migrate deploy --config prisma7.config.ts` from `backend`. For production, run migrations as a controlled release step before routing traffic to code that depends on them.
- Configure `FRONTEND_URL` on the API to the exact deployed frontend origin. Configure HTTPS and secrets on the hosting platforms; do not commit production environment files.

Password-reset links are only functional when `PASSWORD_RESET_ENABLED=true` is set on the API, email credentials and sender are configured, and the frontend reset UI is enabled.

## Contributing

1. Create a focused branch for your change.
2. Keep frontend and backend API changes compatible, or update all affected consumers and tests together.
3. Add or update tests for behavior changes.
4. Run the relevant checks before opening a pull request:
   - Backend: `npm test -- --runInBand` and `npm run build`
   - Frontend: `npm run lint` and `npm run build`
5. Never commit `.env` files, credentials, database dumps, or generated secrets.

## Security

If you discover a security issue, do not publish exploit details in a public issue. Contact the project maintainers privately with the affected component and a concise reproduction.
