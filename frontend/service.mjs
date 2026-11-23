// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { rawHttp } from "@prisma/composer/http";
import { z } from "zod";
import { field } from "@prisma/composer/zod";

export default compute({
  name: "web",
  deps: { api: rawHttp() },
  input: z.object({
    frontendUrl: field(z.string()),
  }),
  build: nextjs({ module: import.meta.url, appDir: "." }),
});
