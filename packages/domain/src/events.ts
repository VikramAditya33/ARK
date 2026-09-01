// SPDX-License-Identifier: MIT

import type { DataClassification } from "./security/classification.js";
import type { DomainEventId, MembershipId, OrganizationId, UserId } from "./identifiers.js";
import type { ProvenancePointer } from "./provenance.js";

export type EventActor =
  | Readonly<{
      kind: "user";
      userId: UserId;
      membershipId: MembershipId;
    }>
  | Readonly<{
      kind: "service";
      service: string;
    }>
  | Readonly<{
      kind: "system";
    }>;

export type EventSource =
  "control-plane" | "capture-worker" | "recovery-runtime" | "reconciliation-worker" | "operator";

export type EventChange<Before, After, Diff> =
  | Readonly<{ kind: "created"; after: After }>
  | Readonly<{ kind: "updated"; before: Before; after: After; diff?: Diff }>
  | Readonly<{ kind: "patched"; diff: Diff }>
  | Readonly<{ kind: "deleted"; before: Before }>;

export type EventEnvelope<Before = unknown, After = unknown, Diff = unknown> = Readonly<{
  eventId: DomainEventId;
  organizationId: OrganizationId;
  aggregateType: string;
  aggregateId: string;
  actor: EventActor;
  source: EventSource;
  change: EventChange<Before, After, Diff>;
  occurredAt: string;
  idempotencyKey: string;
  causationId?: DomainEventId;
  correlationId: string;
  classification: DataClassification;
  provenance: readonly ProvenancePointer[];
}>;

export function assertEventEnvelope(envelope: EventEnvelope): void {
  if (envelope.aggregateType.trim().length === 0 || envelope.aggregateId.trim().length === 0) {
    throw new TypeError("Events require an aggregate type and identifier.");
  }
  if (envelope.idempotencyKey.trim().length === 0 || envelope.correlationId.trim().length === 0) {
    throw new TypeError("Events require idempotency and correlation identifiers.");
  }
  if (Number.isNaN(Date.parse(envelope.occurredAt))) {
    throw new TypeError("Event occurredAt must be an ISO timestamp.");
  }
}
