<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

### Seed production categories and tags

The production seed is additive and repeatable. It upserts the `Frontend`
category and the `Animation`, `React`, `TypeScript`, and `UI` tags by slug. It
refuses local and non-Railway database URLs.

From the `backend` directory, set `DATABASE_URL` to the Railway production
connection string in your shell without committing it or printing it, then run:

```powershell
$env:SEED_TARGET = "railway-production"
npm run seed:production
```

The database migration must already be applied. The command does not reset,
drop, or delete data. Verify the result with the public `GET /categories` and
`GET /tags` endpoints.

### Bootstrap the first admin account

Use the controlled bootstrap script from the `backend` directory with the
Railway production connection string and admin values supplied through the
shell or a secure operational environment. Never commit or print them:

```powershell
$env:SEED_TARGET = "railway-production"
$env:ADMIN_NAME = "Your Admin Name"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "<strong password>"
npm run bootstrap:admin
```

The script upserts only the specified email, sets its role to `ADMIN`, hashes
the password, and refuses local or non-Railway database URLs. It does not
change public registration or expose an admin-promotion endpoint.

### Firebase email/password authentication and password recovery

Configure Firebase email/password sign-in, the Firebase action email template,
and the Firebase web and Admin SDK variables in the frontend and backend
environments. The reset template action URL should be
`https://swepack.vercel.app/reset-password` in production. Firebase ID tokens
are verified by the API; the API continues issuing its own revocable,
HttpOnly-cookie-backed session for SWEPack endpoints.

Existing password accounts migrate on their first successful sign-in: the API
provisions or links a Firebase identity using the verified legacy password,
then only removes the backend password hash and invalidates outstanding reset
tokens and sessions after Firebase successfully exchanges the ID token. This
keeps the legacy password usable if a sign-in is interrupted mid-migration. A
verified Firebase email can also link to an existing SWEPack account with the
same email, preserving its resources, collections, and role. New accounts
must verify their email before first sign-in. The frontend sends Firebase recovery
emails for migrated/new accounts and continues using the backend email recovery
for legacy accounts that have not migrated. Keep `PASSWORD_RESET_ENABLED=true`
and the Resend sender configured during the transition; these legacy settings
can be retired once every password account has moved to Firebase.

### Account deletion requests

Signed-in users can submit one account deletion request from `/account`.
Requests are stored as pending for review; submitting one does not immediately
delete the account or its content. Review and any eventual deletion must be
handled through the service's operational process.

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
