// SPDX-License-Identifier: MIT

import type { MembershipId, OrganizationId, UserId } from "./identifiers.js";

declare const verifiedTenantContextBrand: unique symbol;

export type TenantPrincipal =
  | Readonly<{ kind: "user"; userId: UserId; membershipId: MembershipId }>
  | Readonly<{ kind: "service"; service: string }>;

export type TenantAccessGrant = Readonly<{
  requestedOrganizationId: OrganizationId;
  authorizedOrganizationIds: readonly OrganizationId[];
  principal: TenantPrincipal;
  correlationId: string;
}>;

export type VerifiedTenantContext = Readonly<{
  organizationId: OrganizationId;
  principal: TenantPrincipal;
  correlationId: string;
  readonly [verifiedTenantContextBrand]: true;
}>;

const verifiedContexts = new WeakSet<object>();

export class TenantAccessDeniedError extends Error {
  constructor() {
    super("The principal is not authorized for the requested organization.");
    this.name = "TenantAccessDeniedError";
  }
}

export function verifyTenantContext(grant: TenantAccessGrant): VerifiedTenantContext {
  const authorized = grant.authorizedOrganizationIds.some(
    (organizationId) => organizationId === grant.requestedOrganizationId,
  );
  if (!authorized || grant.correlationId.trim().length === 0) {
    throw new TenantAccessDeniedError();
  }

  const context = Object.freeze({
    organizationId: grant.requestedOrganizationId,
    principal: grant.principal,
    correlationId: grant.correlationId,
  }) as VerifiedTenantContext;
  verifiedContexts.add(context);
  return context;
}

export function assertVerifiedTenantContext(
  context: VerifiedTenantContext,
): asserts context is VerifiedTenantContext {
  if (!verifiedContexts.has(context)) {
    throw new TenantAccessDeniedError();
  }
}
