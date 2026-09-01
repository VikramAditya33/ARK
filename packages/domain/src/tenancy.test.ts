// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { MembershipId, OrganizationId, UserId } from "./identifiers.js";
import {
  TenantAccessDeniedError,
  assertVerifiedTenantContext,
  verifyTenantContext,
  type VerifiedTenantContext,
} from "./tenancy.js";

describe("verified tenant context", () => {
  const organizationId = OrganizationId.generate();
  const principal = {
    kind: "user" as const,
    userId: UserId.generate(),
    membershipId: MembershipId.generate(),
  };

  it("creates a runtime-verifiable context after access evaluation", () => {
    const context = verifyTenantContext({
      requestedOrganizationId: organizationId,
      authorizedOrganizationIds: [organizationId],
      principal,
      correlationId: "request-1",
    });

    expect(context.organizationId).toBe(organizationId);
    expect(() => assertVerifiedTenantContext(context)).not.toThrow();
    expect(Object.isFrozen(context)).toBe(true);
  });

  it("fails closed for an organization outside the evaluated grant", () => {
    expect(() =>
      verifyTenantContext({
        requestedOrganizationId: OrganizationId.generate(),
        authorizedOrganizationIds: [organizationId],
        principal,
        correlationId: "request-2",
      }),
    ).toThrow(TenantAccessDeniedError);
  });

  it("rejects structurally forged contexts at the repository boundary", () => {
    const forged = {
      organizationId,
      principal,
      correlationId: "request-3",
    } as VerifiedTenantContext;

    expect(() => assertVerifiedTenantContext(forged)).toThrow(TenantAccessDeniedError);
  });
});
