import { defineConfig as composer } from "@prisma/composer/config";
import { nextjsBuild } from "@prisma/composer/nextjs/control";
import { nodeBuild } from "@prisma/composer/node/control";
import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";
import { defineConfig as orm, prisma7Schema } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  orm: orm({
    contract: prisma7Schema("backend/prisma/schema.prisma"),
    output: "backend/src/prisma",
    db: { connection: process.env["DATABASE_URL"] },
    migrations: { dir: "backend/migrations" },
  }),
  composer: composer({
    entry: "./module.mjs",
    extensions: [prismaCloud(), nodeBuild(), nextjsBuild()],
    state: prismaState(),
  }),
});
