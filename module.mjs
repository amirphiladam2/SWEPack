// @ts-check
import { module } from "@prisma/composer";
import { postgres } from "@prisma/composer-prisma-cloud/orm";
import { envSecret, serviceOrigin } from "@prisma/composer-prisma-cloud";
import backendService, { dbContract } from "./backend/dist/service.mjs";
import frontendService from "./frontend/service.mjs";

export default module("swepack-staging", ({ provision }) => {
  const db = provision(
    postgres({
      name: "db",
      contract: dbContract,
      config: "./prisma.config.ts",
    }),
  );

  const api = provision(backendService, {
    deps: { db },
    input: {
      jwtSecret: envSecret("JWT_SECRET"), // Signs the API's JWT session tokens.
      frontendUrl: serviceOrigin("swepack-staging.web"),
    },
  });

  provision(frontendService, {
    deps: { api: api.http },
    input: {
      frontendUrl: serviceOrigin("swepack-staging.web"),
    },
  });
});
