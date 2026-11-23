import { compute } from "@prisma/composer-prisma-cloud";
import { rawHttpContract } from "@prisma/composer/http";
import node from "@prisma/composer/node";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import { type } from "arktype";
import { field, secretString } from "@prisma/composer/arktype";
import contractJson from "./prisma/contract.json" with { type: "json" };

const orm = dataContract(contractJson);

const input = type({
  // Signs the API's JWT session tokens.
  jwtSecret: secretString(),
  // Public origin of the web app (CORS, email links, OAuth redirects).
  frontendUrl: field(type("string")),
  // "true" enables the password-reset endpoints.
  passwordResetEnabled: secretString().optional(),
  firebaseProjectId: secretString().optional(),
  firebaseClientEmail: secretString().optional(),
  firebasePrivateKey: secretString().optional(),
  githubClientId: secretString().optional(),
  githubClientSecret: secretString().optional(),
  githubCallbackUrl: secretString().optional(),
  resendApi: secretString().optional(),
  emailFrom: secretString().optional(),
});

export default compute({
  name: "backend",
  deps: { db: postgres(orm) },
  input,
  build: node({
    module: import.meta.url,
    dir: "..",
    entry: "src/main.js",
    dependencies: "external",
  }),
  expose: { http: rawHttpContract },
});
