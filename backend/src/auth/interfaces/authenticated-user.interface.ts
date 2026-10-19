export interface AuthenticatedUser {
  userId: string;
  email: string | null;
  role: string;
  name?: string;
  githubConnected: boolean;
}
