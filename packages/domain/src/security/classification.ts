// SPDX-License-Identifier: MIT

/**
 * ARK's canonical data classifications, ordered from least to most sensitive.
 *
 * Classification follows the value through capture, normalization, recovery,
 * evidence, and incident use. A destination may apply a stricter
 * classification, but it must never silently downgrade one.
 */
export const DATA_CLASSIFICATIONS = [
  "public",
  "internal",
  "confidential",
  "restricted",
  "credential",
] as const;

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

export const OUTPUT_SURFACES = [
  "applicationLog",
  "auditLog",
  "screenshot",
  "replay",
  "evidence",
  "aiContext",
  "publicDemo",
] as const;

export type OutputSurface = (typeof OUTPUT_SURFACES)[number];

/**
 * - allow: raw values may appear on this surface.
 * - redact: record only safe metadata; never include the raw value.
 * - approval: raw values require an explicit policy approval for this use.
 * - deny: raw values are forbidden on this surface.
 */
export type SurfaceDisposition = "allow" | "redact" | "approval" | "deny";

export type SurfaceRule = Readonly<{
  disposition: SurfaceDisposition;
  reason: string;
}>;

export type ClassificationPolicy = Readonly<{
  description: string;
  surfaces: Readonly<Record<OutputSurface, SurfaceRule>>;
}>;

const allow = (reason: string): SurfaceRule => ({ disposition: "allow", reason });
const redact = (reason: string): SurfaceRule => ({ disposition: "redact", reason });
const approval = (reason: string): SurfaceRule => ({ disposition: "approval", reason });
const deny = (reason: string): SurfaceRule => ({ disposition: "deny", reason });

export const CLASSIFICATION_POLICIES: Readonly<Record<DataClassification, ClassificationPolicy>> = {
  public: {
    description: "Information intentionally approved for unrestricted disclosure.",
    surfaces: {
      applicationLog: allow("The value is approved for public disclosure."),
      auditLog: allow("The value is approved for public disclosure."),
      screenshot: allow("The value is approved for public disclosure."),
      replay: allow("The value is approved for public disclosure."),
      evidence: allow("The value is approved for public disclosure."),
      aiContext: allow("The value is approved for public disclosure."),
      publicDemo: allow("The value is approved for public disclosure."),
    },
  },
  internal: {
    description: "Routine company information not intended for public disclosure.",
    surfaces: {
      applicationLog: redact("Logs should carry identifiers and counts, not raw company content."),
      auditLog: redact("Audit the action and field identity without duplicating raw content."),
      screenshot: allow("Authorized internal screenshots may contain routine company data."),
      replay: approval("Long-lived replays require an explicit recording policy."),
      evidence: allow("Tenant-authorized evidence may contain routine internal data."),
      aiContext: approval("AI processing requires an approved provider and purpose."),
      publicDemo: deny("Internal information must not appear in a public demo."),
    },
  },
  confidential: {
    description: "Sensitive business or personal information with meaningful disclosure impact.",
    surfaces: {
      applicationLog: deny("Raw confidential values do not belong in application logs."),
      auditLog: redact("Audit only actor, action, object identity, and safe metadata."),
      screenshot: approval("Capture only when required and authorized for the workflow."),
      replay: approval("Recording requires explicit scope, redaction, and retention policy."),
      evidence: approval("Include only evidence necessary to prove the declared claim."),
      aiContext: approval(
        "AI processing requires explicit policy, minimization, and provider approval.",
      ),
      publicDemo: deny("Confidential information must not appear in a public demo."),
    },
  },
  restricted: {
    description: "Highly sensitive information requiring explicit, narrowly scoped access.",
    surfaces: {
      applicationLog: deny("Raw restricted values are forbidden in application logs."),
      auditLog: redact("Audit access without storing the restricted value."),
      screenshot: approval("Only a narrowly approved capture may contain the value."),
      replay: approval("Only a narrowly approved, access-controlled replay may contain the value."),
      evidence: approval("Evidence inclusion requires field-level approval and restricted access."),
      aiContext: deny("Restricted values are excluded from model context by default."),
      publicDemo: deny("Restricted information is forbidden in a public demo."),
    },
  },
  credential: {
    description: "A secret or capability that grants authentication, authorization, or control.",
    surfaces: {
      applicationLog: deny("Credential values are never logged."),
      auditLog: deny("Audit credential use through metadata, never the credential value."),
      screenshot: deny("Credential entry and display must not be captured."),
      replay: deny("Credential entry and display must not be recorded."),
      evidence: deny("Evidence stores a non-capability reference, never a credential."),
      aiContext: deny("Credentials are never sent to a model."),
      publicDemo: deny("Credentials are never public."),
    },
  },
};

export class ClassificationPolicyError extends Error {
  readonly classification: DataClassification;
  readonly surface: OutputSurface;
  readonly disposition: SurfaceDisposition;

  constructor(classification: DataClassification, surface: OutputSurface, rule: SurfaceRule) {
    super(
      `Raw ${classification} data is not allowed on ${surface} ` + `(policy: ${rule.disposition}).`,
    );
    this.name = "ClassificationPolicyError";
    this.classification = classification;
    this.surface = surface;
    this.disposition = rule.disposition;
  }
}

export function isDataClassification(value: unknown): value is DataClassification {
  return typeof value === "string" && (DATA_CLASSIFICATIONS as readonly string[]).includes(value);
}

export function getSurfaceRule(
  classification: DataClassification,
  surface: OutputSurface,
): SurfaceRule {
  return CLASSIFICATION_POLICIES[classification].surfaces[surface];
}

export function canExposeRawValue(
  classification: DataClassification,
  surface: OutputSurface,
  options: Readonly<{ approved?: boolean }> = {},
): boolean {
  const { disposition } = getSurfaceRule(classification, surface);

  return disposition === "allow" || (disposition === "approval" && options.approved === true);
}

export function assertRawValueAllowed(
  classification: DataClassification,
  surface: OutputSurface,
  options: Readonly<{ approved?: boolean }> = {},
): void {
  if (!canExposeRawValue(classification, surface, options)) {
    throw new ClassificationPolicyError(
      classification,
      surface,
      getSurfaceRule(classification, surface),
    );
  }
}

export function mostRestrictiveClassification(
  classifications: readonly DataClassification[],
): DataClassification {
  if (classifications.length === 0) {
    return "public";
  }

  return classifications.reduce((mostRestrictive, candidate) =>
    DATA_CLASSIFICATIONS.indexOf(candidate) > DATA_CLASSIFICATIONS.indexOf(mostRestrictive)
      ? candidate
      : mostRestrictive,
  );
}
