# SWEPack

SWEPack is a community-built library of software engineering resources. Browse and search curated tools, libraries, documentation, guides, courses, repositories, and communities; save useful finds into personal collections; and submit new resources for review.

The project is a monorepo with a Next.js web application and a NestJS REST API backed by PostgreSQL and Prisma.

## Features

- Browse a paginated resource library with search, categories, and sorting.
- Sign in with GitHub or the existing email/password account flow.
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
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@example.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nreplace-with-service-account-private-key\n-----END PRIVATE KEY-----\n"
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
```

Use a URL-encoded password if it contains characters that have special meaning in a connection string. Keep real credentials in local environment files or your hosting provider's secret manager; do not commit them.

GitHub OAuth is optional in development. To enable it, register a GitHub OAuth App and set its callback URL to `http://localhost:3000/api/auth/github/callback`; then set the three GitHub variables above. Use a separate GitHub OAuth App for development and production because each app has one callback URL.

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
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_web_app_id
```

The browser talks to the API through a same-origin Next.js proxy. `NEXT_PUBLIC_API_URL` is used server-side by that proxy. Firebase ID tokens are verified by the backend, which continues issuing a revocable HttpOnly session cookie for SWEPack APIs. Keep the Firebase Admin private key only in backend environment secrets. Existing password accounts migrate automatically after their first successful legacy sign-in. Keep the password-reset UI enabled only after Firebase recovery is configured; keep the backend password-reset endpoint and Resend sender enabled during the transition so unmigrated accounts can still recover.

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
| `FIREBASE_PROJECT_ID` | Yes for Firebase auth | Firebase project ID used by the Admin SDK. |
| `FIREBASE_CLIENT_EMAIL` | Yes for Firebase auth | Service-account email for the Firebase Admin SDK. |
| `FIREBASE_PRIVATE_KEY` | Yes for Firebase auth | Firebase service-account private key; keep it only in backend secret settings. |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth App client ID. |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth App secret. Keep this only in the backend secret store. |
| `GITHUB_CALLBACK_URL` | Optional | Exact GitHub OAuth callback URL. For local development, use `http://localhost:3000/api/auth/github/callback`; for production, use `https://swepack.vercel.app/api/auth/github/callback`. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes for production | Base URL of the backend API, without an endpoint path. Local development defaults to `http://localhost:3001`. Production builds require an HTTPS URL. |
| `NEXT_PUBLIC_PASSWORD_RESET_ENABLED` | No | Set to `true` to expose password-reset UI. Keep this consistent with the backend setting. |
| `FRONTEND_URL` | Yes for production | Exact frontend origin used by the same-origin API proxy to validate mutation requests; for production, `https://swepack.vercel.app`. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes for Firebase auth | Firebase web app API key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes for Firebase auth | Firebase project auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes for Firebase auth | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes for Firebase auth | Firebase web app ID. |

`NEXT_PUBLIC_*` values are included in browser-facing code. Never put secrets in frontend environment variables.

### GitHub OAuth App settings

Set the OAuth App's **Homepage URL** to the app's origin and its **Authorization callback URL** exactly to the value of `GITHUB_CALLBACK_URL`. Request only `read:user` and `user:email`; no repository permissions are needed. Use separate applications for development and production:

| Environment | Callback URL |
| --- | --- |
| Development | `http://localhost:3000/api/auth/github/callback` |
| Production | `https://swepack.vercel.app/api/auth/github/callback` |

Use `http://localhost:3000` as the development app's Homepage URL and `https://swepack.vercel.app` as the production app's.

The deployed frontend origin is `https://swepack.vercel.app`; its API is `https://swepack.onrender.com`. The backend exchanges the authorization code using its client secret. A Next.js server route validates the state cookie, stores the JWT in a host-only HttpOnly cookie, and proxies subsequent API requests using that JWT. Mutating proxy requests must have the configured exact `FRONTEND_URL` origin. Cookies use `SameSite=Lax`, `Secure` in production, `HttpOnly`, and a seven-day lifetime; logout clears the cookie and increments the user's token version to revoke sessions.

Email/password registration, login, and recovery remain available. Matching email addresses are never linked automatically; an existing signed-in user can explicitly connect a GitHub account from the account menu.

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
| Authentication | Firebase email/password sign-up and sign-in; `POST /auth/login` migrates existing credentials, `POST /auth/firebase/exchange` exchanges Firebase ID tokens, `POST /auth/logout`, `GET /auth/me`; GitHub OAuth initiation/exchange is mediated by the frontend |
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

- **Frontend:** Deploy the `frontend` directory as the Vercel project root. Set `NEXT_PUBLIC_API_URL=https://swepack.onrender.com` and `FRONTEND_URL=https://swepack.vercel.app`. Set the password-reset flag according to the backend configuration.
- **Firebase:** Enable Email/Password in Firebase Authentication, add `swepack.vercel.app` to Authorized domains, and set the password-reset email template action URL to `https://swepack.vercel.app/reset-password`. Put the Firebase web app values in Vercel and the Admin service-account values in the backend's secret settings.
- **Backend:** Deploy the `backend` directory to a Node.js host. Configure the backend environment variables in the host's secret settings, including Firebase and GitHub credentials and `GITHUB_CALLBACK_URL=https://swepack.vercel.app/api/auth/github/callback`; build with `npm run build`, and start with `npm run start:prod`.
- **Database:** Apply committed migrations to the intended database with `npx prisma migrate deploy --config prisma7.config.ts` from `backend`. For production, run migrations as a controlled release step before routing traffic to code that depends on them.
- Configure `FRONTEND_URL=https://swepack.vercel.app` on the API as well, so CORS and same-origin mutation validation agree. Configure HTTPS and secrets on the hosting platforms; do not commit production environment files.

Before enabling GitHub sign-in in production:

1. Create a production GitHub OAuth App with Homepage URL `https://swepack.vercel.app` and callback URL `https://swepack.vercel.app/api/auth/github/callback`.
2. Add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL=https://swepack.vercel.app/api/auth/github/callback` to the backend's secret configuration. Do not put the client secret in Vercel.
3. Confirm Vercel has `FRONTEND_URL=https://swepack.vercel.app` and `NEXT_PUBLIC_API_URL=https://swepack.onrender.com`.
4. Review the new `GithubAccount`, `GithubOAuthState`, and nullable email/password migration, then apply it to the intended database with the controlled `migrate deploy` release step. Do not run `migrate dev` or a reset against production.
5. Deploy the backend, then the frontend. Test first-time and returning GitHub users, account linking, password sign-in, logout, resource operations, and an existing admin account.

Firebase password-reset links require Firebase recovery configuration and the frontend reset UI. During migration, keep `PASSWORD_RESET_ENABLED=true` and configure Resend so accounts that have not migrated yet can recover; the Firebase reset email path works independently for migrated accounts.

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
