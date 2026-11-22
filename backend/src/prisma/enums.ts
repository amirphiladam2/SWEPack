// The schema's enum members as plain string unions for request validation.
// The emitted contract (`src/prisma/contract.json`) is the source of truth;
// the runtime reads the members from `db.nativeEnums` off the client.

export const resourceTypes = [
  'TOOL',
  'DOCUMENTATION',
  'LIBRARY',
  'GUIDE',
  'COURSE',
  'ROADMAP',
  'ARTICLE',
  'COMMUNITY',
  'REPOSITORY',
  'OTHER',
] as const;

export type ResourceTypeValue = (typeof resourceTypes)[number];

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

export const resourceStatuses = ['PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;

export type ResourceStatusValue = (typeof resourceStatuses)[number];

export enum ResourceStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}
