-- Add a version to invalidate existing JWTs after password recovery.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
