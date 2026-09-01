// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import { DemoOpsDatabase } from "./database.js";
import {
  LARGE_ATTACHMENT_ID,
  OPS_FIXTURE_COUNTS,
  OPS_FLAGSHIP_CUSTOMER_ID,
  createOpsFixtures,
  sha256,
} from "./fixtures.js";

describe("Ops fixture oracle", () => {
  it("seeds exact database counts", () => {
    const database = new DemoOpsDatabase();
    try {
      expect(database.counts()).toEqual(OPS_FIXTURE_COUNTS);
    } finally {
      database.close();
    }
  });

  it("verifies every artifact checksum and the oversized fixture", () => {
    const fixtures = createOpsFixtures();
    for (const attachment of fixtures.attachments) {
      expect(sha256(attachment.content)).toBe(attachment.checksum);
    }
    expect(
      fixtures.attachments.find(({ id }) => id === LARGE_ATTACHMENT_ID)?.content.byteLength,
    ).toBe(2 * 1024 * 1024);
  });

  it("retains the required incident, Unicode, missing-field, archive, and tombstone edges", () => {
    const fixtures = createOpsFixtures();
    expect(
      fixtures.issues.filter(
        ({ customerId, severity, state }) =>
          customerId === OPS_FLAGSHIP_CUSTOMER_ID && severity === "high" && state === "open",
      ),
    ).toHaveLength(3);
    expect(fixtures.contracts.some(({ title }) => title.includes("München"))).toBe(true);
    expect(fixtures.issues.some(({ dueDate }) => dueDate === null)).toBe(true);
    expect(fixtures.contracts.some(({ archivedAt }) => archivedAt !== null)).toBe(true);
    expect(fixtures.issues.some(({ deletedAt }) => deletedAt !== null)).toBe(true);
  });
});
