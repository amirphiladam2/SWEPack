-- GitHub accounts may not provide an email address or a password.
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

CREATE TYPE "GithubOAuthPurpose" AS ENUM ('LOGIN', 'LINK');

CREATE TABLE "GithubAccount" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GITHUB',
    "providerAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GithubOAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "purpose" "GithubOAuthPurpose" NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GithubOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GithubAccount_provider_providerAccountId_key"
    ON "GithubAccount"("provider", "providerAccountId");
CREATE INDEX "GithubAccount_userId_idx" ON "GithubAccount"("userId");
CREATE UNIQUE INDEX "GithubOAuthState_stateHash_key"
    ON "GithubOAuthState"("stateHash");
CREATE INDEX "GithubOAuthState_expiresAt_idx"
    ON "GithubOAuthState"("expiresAt");

ALTER TABLE "GithubAccount"
    ADD CONSTRAINT "GithubAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GithubOAuthState"
    ADD CONSTRAINT "GithubOAuthState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
