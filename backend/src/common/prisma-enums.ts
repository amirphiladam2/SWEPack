/**
 * The enum values the Prisma contract stores (the generated client's enums
 * used to provide these; the values are unchanged).
 */
export enum ResourceType {
  TOOL = 'TOOL',
  DOCUMENTATION = 'DOCUMENTATION',
  LIBRARY = 'LIBRARY',
  GUIDE = 'GUIDE',
  COURSE = 'COURSE',
  ROADMAP = 'ROADMAP',
  ARTICLE = 'ARTICLE',
  COMMUNITY = 'COMMUNITY',
  REPOSITORY = 'REPOSITORY',
  OTHER = 'OTHER',
}

export enum ResourceStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
