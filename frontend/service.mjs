// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { rawHttp } from "@prisma/composer/http";
import { type } from "arktype";
import { secretString } from "@prisma/composer/arktype";

const input = type({
  // Firebase web app config, injected into the browser for Firebase sign-in.
  firebaseApiKey: secretString().optional(),
  firebaseAuthDomain: secretString().optional(),
  firebaseProjectId: secretString().optional(),
  firebaseAppId: secretString().optional(),
});

export default compute({
  name: "frontend",
  deps: { api: rawHttp() },
  input,
  build: nextjs({ module: import.meta.url, appDir: "." }),
});
