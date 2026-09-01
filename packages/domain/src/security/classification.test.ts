// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  CLASSIFICATION_POLICIES,
  ClassificationPolicyError,
  DATA_CLASSIFICATIONS,
  OUTPUT_SURFACES,
  assertRawValueAllowed,
  canExposeRawValue,
  getSurfaceRule,
  isDataClassification,
  mostRestrictiveClassification,
} from "./classification.js";

describe("data classification", () => {
  it("defines the five classifications in increasing sensitivity order", () => {
    expect(DATA_CLASSIFICATIONS).toEqual([
      "public",
      "internal",
      "confidential",
      "restricted",
      "credential",
    ]);
  });

  it("defines a rule for every classification and output surface", () => {
    for (const classification of DATA_CLASSIFICATIONS) {
      for (const surface of OUTPUT_SURFACES) {
        const rule = CLASSIFICATION_POLICIES[classification].surfaces[surface];
        expect(rule).toBeDefined();
        expect(rule.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it("denies credential raw values on every output surface", () => {
    for (const surface of OUTPUT_SURFACES) {
      expect(getSurfaceRule("credential", surface).disposition).toBe("deny");
      expect(canExposeRawValue("credential", surface, { approved: true })).toBe(false);
    }
  });

  it("allows public raw values on every output surface", () => {
    for (const surface of OUTPUT_SURFACES) {
      expect(canExposeRawValue("public", surface)).toBe(true);
    }
  });

  it("requires explicit approval on approval surfaces", () => {
    expect(canExposeRawValue("confidential", "evidence")).toBe(false);
    expect(canExposeRawValue("confidential", "evidence", { approved: true })).toBe(true);
  });

  it("never permits raw values through a redaction rule", () => {
    expect(getSurfaceRule("internal", "applicationLog").disposition).toBe("redact");
    expect(canExposeRawValue("internal", "applicationLog", { approved: true })).toBe(false);
  });

  it("rejects every non-public classification in public demos", () => {
    for (const classification of DATA_CLASSIFICATIONS.slice(1)) {
      expect(canExposeRawValue(classification, "publicDemo", { approved: true })).toBe(false);
    }
  });

  it("throws a typed policy error", () => {
    expect(() => assertRawValueAllowed("credential", "evidence")).toThrow(
      ClassificationPolicyError,
    );

    try {
      assertRawValueAllowed("credential", "evidence");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ClassificationPolicyError);
      expect(error).toMatchObject({
        classification: "credential",
        surface: "evidence",
        disposition: "deny",
      });
    }
  });

  it("never downgrades combined classifications", () => {
    expect(mostRestrictiveClassification([])).toBe("public");
    expect(mostRestrictiveClassification(["internal", "restricted", "confidential"])).toBe(
      "restricted",
    );
    expect(mostRestrictiveClassification(["credential", "public", "restricted"])).toBe(
      "credential",
    );
  });

  it("rejects unknown classification values", () => {
    expect(isDataClassification("confidential")).toBe(true);
    expect(isDataClassification("secret")).toBe(false);
    expect(isDataClassification(null)).toBe(false);
  });
});
