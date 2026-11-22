import node from '@prisma/composer/node';
import { compute } from '@prisma/composer-prisma-cloud';

export default compute({
  name: 'backend',
  deps: {},
  build: node({
    module: './service.ts',
    dir: 'dist',
    entry: 'src/server.js',
    dependencies: 'external',
  }),
});
