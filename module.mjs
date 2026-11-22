// @ts-check
import { module } from "@prisma/composer";
import { envSecret, postgres } from "@prisma/composer-prisma-cloud/orm";
import backendService, { ormContract } from "./backend/src/service.mjs";

export default module("swe-computet-staging", ({ provision }) => {
  provision(postgres({ name: "db", contract: ormContract, config: "prisma.config.ts" }));
  provision(backendService, {
    input: {
      jwtSecret: envSecret("JWT_SECRET"), // Signs the API's JWT session tokens.
    },
  });
});
