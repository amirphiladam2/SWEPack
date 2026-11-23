// Enum values from backend/prisma/schema.prisma (the Prisma 8 contract keeps
// these as value sets; they are validated against it by the migrations).
export const ResourceType = {
  TOOL: 'TOOL',
  DOCUMENTATION: 'DOCUMENTATION',
  LIBRARY: 'LIBRARY',
  GUIDE: 'GUIDE',
  COURSE: 'COURSE',
  ROADMAP: 'ROADMAP',
  ARTICLE: 'ARTICLE',
  COMMUNITY: 'COMMUNITY',
  REPOSITORY: 'REPOSITORY',
  OTHER: 'OTHER',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const ResourceStatus = {
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ResourceStatus = (typeof ResourceStatus)[keyof typeof ResourceStatus];

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const GithubOAuthPurpose = {
  LOGIN: 'LOGIN',
  LINK: 'LINK',
} as const;
export type GithubOAuthPurpose =
  (typeof GithubOAuthPurpose)[keyof typeof GithubOAuthPurpose];

export const AccountDeletionRequestStatus = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  COMPLETED: 'COMPLETED',
} as const;
export type AccountDeletionRequestStatus =
  (typeof AccountDeletionRequestStatus)[keyof typeof AccountDeletionRequestStatus];
