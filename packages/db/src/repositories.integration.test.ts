// SPDX-License-Identifier: MIT

import { OrganizationId, SourceSystemId, verifyTenantContext } from "@ark/domain";
import { describe, expect, it } from "vitest";

import { createDatabase } from "./database.js";
import { applyMigrations } from "./migrator.js";
import { TenantOrganizationRepository, createTenantRepositories } from "./repositories.js";
import { organizations } from "./schema/index.js";
import { withTemporaryDatabase } from "./testing/postgres.js";

const databaseUrl = process.env.DATABASE_URL;
const migrationDirectory = new URL("../../../infra/migrations/", import.meta.url).pathname;

describe.skipIf(!databaseUrl)("tenant-scoped repositories", () => {
  it("fails closed for cross-tenant reads, writes, updates, and deletes", async () => {
    await withTemporaryDatabase(databaseUrl!, async (temporaryDatabaseUrl) => {
      await applyMigrations(temporaryDatabaseUrl, migrationDirectory);
      const handle = createDatabase(temporaryDatabaseUrl, { max: 1 });
      const firstOrganizationId = OrganizationId.generate();
      const secondOrganizationId = OrganizationId.generate();

      try {
        await handle.db.insert(organizations).values([
          { id: firstOrganizationId, slug: "tenant-first", name: "First Tenant" },
          { id: secondOrganizationId, slug: "tenant-second", name: "Second Tenant" },
        ]);
        const firstContext = verifyTenantContext({
          requestedOrganizationId: firstOrganizationId,
          authorizedOrganizationIds: [firstOrganizationId],
          principal: { kind: "service", service: "repository-test" },
          correlationId: "tenant-first-test",
        });
        const secondContext = verifyTenantContext({
          requestedOrganizationId: secondOrganizationId,
          authorizedOrganizationIds: [secondOrganizationId],
          principal: { kind: "service", service: "repository-test" },
          correlationId: "tenant-second-test",
        });
        const first = createTenantRepositories(handle.db, firstContext);
        const second = createTenantRepositories(handle.db, secondContext);

        const firstSource = await first.sourceSystems.insert({
          id: SourceSystemId.generate(),
          key: "crm",
          displayName: "First CRM",
          kind: "demo-crm",
        });
        const secondSource = await second.sourceSystems.insert({
          id: SourceSystemId.generate(),
          key: "crm",
          displayName: "Second CRM",
          kind: "demo-crm",
        });

        await expect(first.sourceSystems.findById(firstSource.id)).resolves.toMatchObject({
          id: firstSource.id,
          organizationId: firstOrganizationId,
        });
        await expect(first.sourceSystems.findById(secondSource.id)).resolves.toBeNull();
        await expect(
          first.sourceSystems.updateById(secondSource.id, { displayName: "Compromised" }),
        ).resolves.toBeNull();
        await expect(first.sourceSystems.deleteById(secondSource.id)).resolves.toBe(false);
        await expect(second.sourceSystems.findById(secondSource.id)).resolves.toMatchObject({
          displayName: "Second CRM",
        });
        await expect(first.sourceSystems.list()).resolves.toHaveLength(1);

        const organizationRepository = new TenantOrganizationRepository(handle.db, firstContext);
        await expect(organizationRepository.findById(secondOrganizationId)).resolves.toBeNull();

        for (const repository of Object.values(first)) {
          await expect(repository.findById(OrganizationId.generate())).resolves.toBeNull();
        }
      } finally {
        await handle.close();
      }
    });
  });
});
