// SPDX-License-Identifier: MIT

import {
  OrganizationId,
  TenantAccessDeniedError,
  type VerifiedTenantContext,
  verifyTenantContext,
} from "@ark/domain";
import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";

import { TenantScopedRepository, createTenantRepositories } from "./repositories.js";
import * as schema from "./schema/index.js";

describe("tenant repository construction", () => {
  it("rejects a structurally forged tenant context", () => {
    const database = drizzle.mock({ schema });
    const forged = {
      organizationId: OrganizationId.generate(),
      principal: { kind: "service", service: "forged" },
      correlationId: "forged",
    } as VerifiedTenantContext;

    expect(() => new TenantScopedRepository(database, forged, schema.sourceSystems)).toThrow(
      TenantAccessDeniedError,
    );
  });

  it("constructs every repository through the same verified tenant scope", () => {
    const database = drizzle.mock({ schema });
    const organizationId = OrganizationId.generate();
    const context = verifyTenantContext({
      requestedOrganizationId: organizationId,
      authorizedOrganizationIds: [organizationId],
      principal: { kind: "service", service: "unit-test" },
      correlationId: "repository-construction",
    });
    const repositories = createTenantRepositories(database, context);

    expect(Object.keys(repositories)).toHaveLength(35);
    for (const repository of Object.values(repositories)) {
      expect(repository).toBeInstanceOf(TenantScopedRepository);
      expect(repository.organizationId).toBe(organizationId);
    }
  });
});
