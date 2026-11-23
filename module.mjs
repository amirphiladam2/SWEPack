// @ts-check
import { module } from "@prisma/composer";
import { envSecret, serviceOrigin } from "@prisma/composer-prisma-cloud";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import backendService from "./backend/dist/src/service.mjs";
import frontendService from "./frontend/service.mjs";
import contractJson from "./backend/src/prisma/contract.json" with { type: "json" };

/** The app's data contract, emitted from backend/prisma/schema.prisma by `prisma contract emit`. */
const orm = dataContract(contractJson);

export default module("swe-computet-staging", ({ provision }) => {
  // The managed Postgres database; its committed migrations run on every deploy.
  const db = provision(postgres({ name: "db", contract: orm, config: "./prisma.config.ts" }));

  const backend = provision(backendService, {
    deps: { db },
    input: {
      // Signs the API's JWT session tokens.
      jwtSecret: envSecret("JWT_SECRET"),
      // Public origin of the web app, used for CORS, email links and OAuth redirects.
      frontendUrl: serviceOrigin("swe-computet-staging.frontend"),
      // Set to "true" to enable the password-reset endpoints.
      passwordResetEnabled: envSecret("PASSWORD_RESET_ENABLED"),
      // Firebase Admin service account, verifies Firebase sign-ins.
      firebaseProjectId: envSecret("FIREBASE_PROJECT_ID"),
      firebaseClientEmail: envSecret("FIREBASE_CLIENT_EMAIL"),
      firebasePrivateKey: envSecret("FIREBASE_PRIVATE_KEY"),
      // GitHub OAuth app, enables GitHub sign-in.
      githubClientId: envSecret("GITHUB_CLIENT_ID"),
      githubClientSecret: envSecret("GITHUB_CLIENT_SECRET"),
      githubCallbackUrl: envSecret("GITHUB_CALLBACK_URL"),
      // Resend API key and verified sender address, for password-reset email.
      resendApi: envSecret("RESEND_API"),
      emailFrom: envSecret("EMAIL_FROM"),
    },
  });

  provision(frontendService, {
    deps: { api: backend.http },
    input: {
      // Firebase web app config, injected into the browser for Firebase sign-in.
      firebaseApiKey: envSecret("NEXT_PUBLIC_FIREBASE_API_KEY"),
      firebaseAuthDomain: envSecret("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
      firebaseProjectId: envSecret("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      firebaseAppId: envSecret("NEXT_PUBLIC_FIREBASE_APP_ID"),
    },
  });
});
