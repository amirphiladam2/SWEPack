// @ts-check
import { module } from "@prisma/composer";
import { envSecret, rawPostgres, serviceOrigin } from "@prisma/composer-prisma-cloud";
import apiService from "./backend/service.mjs";
import webService from "./frontend/service.mjs";

export default module("swe-computet-staging", ({ provision }) => {
  const db = rawPostgres({ name: "db" });

  provision(apiService, {
    deps: { db },
    input: {
      jwtSecret: envSecret("JWT_SECRET"), // Signs the API's session JWTs.
      frontendUrl: serviceOrigin("swe-computet-staging.web"),
      passwordResetEnabled: envSecret("PASSWORD_RESET_ENABLED"), // Enables the API's password-reset flow.
      firebaseProjectId: envSecret("FIREBASE_PROJECT_ID"), // Firebase Admin project used to verify sign-ins.
      firebaseClientEmail: envSecret("FIREBASE_CLIENT_EMAIL"), // Firebase service-account email.
      firebasePrivateKey: envSecret("FIREBASE_PRIVATE_KEY"), // Firebase service-account private key.
      githubClientId: envSecret("GITHUB_CLIENT_ID"), // GitHub OAuth App client ID.
      githubClientSecret: envSecret("GITHUB_CLIENT_SECRET"), // GitHub OAuth App client secret.
      githubCallbackUrl: envSecret("GITHUB_CALLBACK_URL"), // GitHub OAuth callback URL.
      resendApiKey: envSecret("RESEND_API"), // Resend API key for password-reset email.
      emailFrom: envSecret("EMAIL_FROM"), // Verified Resend sender address.
    },
  });

  provision(webService, {
    input: {
      apiUrl: serviceOrigin("swe-computet-staging.api"),
      frontendUrl: serviceOrigin("swe-computet-staging.web"),
    },
  });
});
