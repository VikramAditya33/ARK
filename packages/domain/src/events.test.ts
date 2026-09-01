// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { assertEventEnvelope, type EventEnvelope } from "./events.js";
import { DomainEventId, OrganizationId } from "./identifiers.js";

describe("append-only event envelope", () => {
  const event: EventEnvelope = {
    eventId: DomainEventId.generate(),
    organizationId: OrganizationId.generate(),
    aggregateType: "recovery-task",
    aggregateId: "task-42",
    actor: { kind: "service", service: "recovery-runtime" },
    source: "recovery-runtime",
    change: { kind: "created", after: { title: "Prepare renewal" } },
    occurredAt: "2026-09-01T09:00:00.000Z",
    idempotencyKey: "incident-1:task-42:create",
    correlationId: "incident-1",
    classification: "internal",
    provenance: [],
  };

  it("accepts a fully attributable recovery event", () => {
    expect(() => assertEventEnvelope(event)).not.toThrow();
  });

  it("requires idempotency, correlation, aggregate, and time metadata", () => {
    expect(() => assertEventEnvelope({ ...event, idempotencyKey: "" })).toThrow(TypeError);
    expect(() => assertEventEnvelope({ ...event, correlationId: "" })).toThrow(TypeError);
    expect(() => assertEventEnvelope({ ...event, aggregateType: "" })).toThrow(TypeError);
    expect(() => assertEventEnvelope({ ...event, occurredAt: "invalid" })).toThrow(TypeError);
  });
});
