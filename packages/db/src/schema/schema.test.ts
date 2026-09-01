// SPDX-License-Identifier: MIT

import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { TENANT_TABLES } from "../repositories.js";
import { connectorDefinitions, organizations, users } from "./index.js";

describe("database schema tenancy", () => {
  it("gives every customer-owned repository table an organization scope", () => {
    const names = new Set<string>();

    for (const table of Object.values(TENANT_TABLES)) {
      const columns = getTableColumns(table);
      expect(columns).toHaveProperty("organizationId");
      expect(columns).toHaveProperty("id");
      names.add(getTableName(table));
    }

    expect(names.size).toBe(Object.keys(TENANT_TABLES).length);
  });

  it("keeps only root identity and connector catalog tables global", () => {
    expect([organizations, users, connectorDefinitions].map(getTableName).sort()).toEqual([
      "connector_definitions",
      "organizations",
      "users",
    ]);
  });
});
