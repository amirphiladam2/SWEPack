import node from "@prisma/composer/node";
import { compute } from "@prisma/composer-prisma-cloud";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import { rawHttpContract } from "@prisma/composer/http";
import { type } from "arktype";
import { field, secretString } from "@prisma/composer/arktype";
import contractJson from "./src/prisma/contract.json" with { type: "json" };
import type { Contract } from "./src/prisma/contract.js";

export const dbContract = dataContract<Contract>(contractJson);

export default compute({
  name: "api",
  deps: { db: postgres(dbContract) },
  input: type({
    jwtSecret: secretString(),
    frontendUrl: field(type("string")),
  }),
  build: node({
    module: import.meta.url,
    dir: "dist",
    entry: "src/main.js",
    dependencies: "external",
  }),
  expose: { http: rawHttpContract },
});
