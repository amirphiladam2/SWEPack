// @ts-check
import nextjs from "@prisma/composer/nextjs";
import { compute } from "@prisma/composer-prisma-cloud";
import { type } from "arktype";
import { field } from "@prisma/composer/arktype";

export default compute({
  name: "web",
  deps: {},
  input: type({
    apiUrl: field(type("string")),
    frontendUrl: field(type("string")),
  }),
  build: nextjs({ module: import.meta.url, appDir: "." }),
});
