import { module } from '@prisma/composer';
import backendService from './service';

export default module('swepack', ({ provision }) => {
  provision(backendService);
});
