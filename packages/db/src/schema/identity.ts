// SPDX-License-Identifier: MIT

import type { MembershipId, OrganizationId, RoleId, UserId } from "@ark/domain";
import { foreignKey, jsonb, pgTable, text, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { createdAt, emptyJsonArray, updatedAt } from "./shared.js";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").$type<OrganizationId>().defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").$type<UserId>().defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").$type<RoleId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    permissions: jsonb("permissions").$type<readonly string[]>().default(emptyJsonArray).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("roles_org_key_unique").on(table.organizationId, table.key),
    unique("roles_org_id_unique").on(table.organizationId, table.id),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").$type<MembershipId>().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .$type<OrganizationId>()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").$type<RoleId>().notNull(),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("memberships_org_user_unique").on(table.organizationId, table.userId),
    unique("memberships_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      columns: [table.organizationId, table.roleId],
      foreignColumns: [roles.organizationId, roles.id],
      name: "memberships_role_same_org_fk",
    }).onDelete("restrict"),
  ],
);
