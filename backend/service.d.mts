// Type declarations for backend/service.mjs — the Composer service
// declaration the API's entry imports for its port, database and input.

export interface ApiInput {
  jwtSecret: string;
  frontendUrl: string;
  passwordResetEnabled?: string;
  firebaseProjectId?: string;
  firebaseClientEmail?: string;
  firebasePrivateKey?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  resendApiKey?: string;
  emailFrom?: string;
}

interface ComposerService {
  load(): { db: { url: string } };
  input(): ApiInput;
  port(): number;
}

declare const service: ComposerService;
export default service;
