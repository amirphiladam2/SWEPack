// @ts-check
import node from "@prisma/composer/node";
import { compute, rawPostgres } from "@prisma/composer-prisma-cloud";
import { type } from "arktype";
import { field, secretString } from "@prisma/composer/arktype";

export default compute({
  name: "api",
  deps: { db: rawPostgres() },
  input: type({
    jwtSecret: secretString(),
    frontendUrl: field(type("string")),
    "passwordResetEnabled?": secretString(),
    "firebaseProjectId?": secretString(),
    "firebaseClientEmail?": secretString(),
    "firebasePrivateKey?": secretString(),
    "githubClientId?": secretString(),
    "githubClientSecret?": secretString(),
    "githubCallbackUrl?": secretString(),
    "resendApiKey?": secretString(),
    "emailFrom?": secretString(),
  }),
  build: node({
    module: import.meta.url,
    dir: "dist",
    entry: "src/main.js",
    dependencies: "external",
  }),
});
