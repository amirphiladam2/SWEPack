#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/378f21c54fc404c786bef49b553e410d9a53fc575a3330c694b246a2fa97a79c/contract';
import endContract from '../../snapshots/378f21c54fc404c786bef49b553e410d9a53fc575a3330c694b246a2fa97a79c/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'AccountDeletionRequestStatus',
        members: ['PENDING', 'IN_REVIEW', 'COMPLETED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'GithubOAuthPurpose',
        members: ['LOGIN', 'LINK'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ResourceStatus',
        members: ['PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ResourceType',
        members: [
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
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'UserRole',
        members: ['USER', 'ADMIN'],
      }),
      this.createTable({
        schema: 'public',
        table: 'AccountDeletionRequest',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requestedAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('reviewedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('status', '"AccountDeletionRequestStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: {
              codecId: 'pg/enum@1',
              typeParams: { typeName: 'AccountDeletionRequestStatus' },
            },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Category',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('parentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Collection',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CollectionResource',
        columns: [
          col('collectionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('resourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['collectionId', 'resourceId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'GithubAccount',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider', 'text', {
            notNull: true,
            default: lit('GITHUB'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('providerAccountId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'GithubOAuthState',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('purpose', '"GithubOAuthPurpose"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'GithubOAuthPurpose' } },
          }),
          col('stateHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PasswordResetToken',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Resource',
        columns: [
          col('categoryId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('domain', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('faviconUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('logoUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('previewImageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"ResourceStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ResourceStatus' } },
          }),
          col('submittedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', '"ResourceType"', {
            notNull: true,
            default: lit('OTHER'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ResourceType' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ResourceTag',
        columns: [
          col('resourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tagId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['resourceId', 'tagId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'SavedResource',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('resourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['userId', 'resourceId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Tag',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firebaseUid', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('password', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', '"UserRole"', {
            notNull: true,
            default: lit('USER'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'UserRole' } },
          }),
          col('tokenVersion', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccountDeletionRequest',
        index: 'AccountDeletionRequest_status_requestedAt_idx',
        columns: ['status', 'requestedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AccountDeletionRequest',
        index: 'AccountDeletionRequest_userId_key',
        columns: ['userId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Category',
        index: 'Category_parentId_idx',
        columns: ['parentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Category',
        index: 'Category_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Collection',
        index: 'Collection_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Collection',
        index: 'Collection_userId_slug_key',
        columns: ['userId', 'slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'CollectionResource',
        index: 'CollectionResource_resourceId_idx',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'GithubAccount',
        index: 'GithubAccount_provider_providerAccountId_key',
        columns: ['provider', 'providerAccountId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'GithubAccount',
        index: 'GithubAccount_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'GithubOAuthState',
        index: 'GithubOAuthState_expiresAt_idx',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'GithubOAuthState',
        index: 'GithubOAuthState_stateHash_key',
        columns: ['stateHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PasswordResetToken',
        index: 'PasswordResetToken_expiresAt_idx',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PasswordResetToken',
        index: 'PasswordResetToken_tokenHash_key',
        columns: ['tokenHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PasswordResetToken',
        index: 'PasswordResetToken_userId_idx',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resource',
        index: 'Resource_categoryId_idx',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resource',
        index: 'Resource_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resource',
        index: 'Resource_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resource',
        index: 'Resource_status_idx',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resource',
        index: 'Resource_type_idx',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Resource',
        index: 'Resource_url_key',
        columns: ['url'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'ResourceTag',
        index: 'ResourceTag_tagId_idx',
        columns: ['tagId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'SavedResource',
        index: 'SavedResource_resourceId_idx',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Tag',
        index: 'Tag_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_firebaseUid_key',
        columns: ['firebaseUid'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AccountDeletionRequest',
        foreignKey: {
          name: 'AccountDeletionRequest_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Category',
        foreignKey: {
          name: 'Category_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'Category', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Collection',
        foreignKey: {
          name: 'Collection_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CollectionResource',
        foreignKey: {
          name: 'CollectionResource_collectionId_fkey',
          columns: ['collectionId'],
          references: { schema: 'public', table: 'Collection', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CollectionResource',
        foreignKey: {
          name: 'CollectionResource_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'Resource', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'GithubAccount',
        foreignKey: {
          name: 'GithubAccount_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'GithubOAuthState',
        foreignKey: {
          name: 'GithubOAuthState_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PasswordResetToken',
        foreignKey: {
          name: 'PasswordResetToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Resource',
        foreignKey: {
          name: 'Resource_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'Category', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Resource',
        foreignKey: {
          name: 'Resource_submittedById_fkey',
          columns: ['submittedById'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ResourceTag',
        foreignKey: {
          name: 'ResourceTag_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'Resource', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ResourceTag',
        foreignKey: {
          name: 'ResourceTag_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'Tag', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SavedResource',
        foreignKey: {
          name: 'SavedResource_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'SavedResource',
        foreignKey: {
          name: 'SavedResource_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'Resource', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
