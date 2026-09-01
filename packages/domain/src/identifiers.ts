// SPDX-License-Identifier: MIT

import { randomUUID } from "node:crypto";

declare const arkIdentifierBrand: unique symbol;

export type ArkIdentifier<Kind extends string> = string & {
  readonly [arkIdentifierBrand]: Kind;
};

export type IdentifierFactory<Identifier extends ArkIdentifier<string>> = Readonly<{
  generate: () => Identifier;
  is: (value: unknown) => value is Identifier;
  parse: (value: unknown) => Identifier;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function identifierFactory<Kind extends string>(): IdentifierFactory<ArkIdentifier<Kind>> {
  const is = (value: unknown): value is ArkIdentifier<Kind> =>
    typeof value === "string" && uuidPattern.test(value);

  return Object.freeze({
    generate: () => randomUUID() as ArkIdentifier<Kind>,
    is,
    parse: (value: unknown) => {
      if (!is(value)) {
        throw new TypeError("ARK identifiers must be UUIDs.");
      }
      return value;
    },
  });
}

export type OrganizationId = ArkIdentifier<"organization">;
export const OrganizationId = identifierFactory<"organization">();
export type UserId = ArkIdentifier<"user">;
export const UserId = identifierFactory<"user">();
export type MembershipId = ArkIdentifier<"membership">;
export const MembershipId = identifierFactory<"membership">();
export type RoleId = ArkIdentifier<"role">;
export const RoleId = identifierFactory<"role">();
export type SourceSystemId = ArkIdentifier<"source-system">;
export const SourceSystemId = identifierFactory<"source-system">();
export type ConnectorDefinitionId = ArkIdentifier<"connector-definition">;
export const ConnectorDefinitionId = identifierFactory<"connector-definition">();
export type ConnectorInstanceId = ArkIdentifier<"connector-instance">;
export const ConnectorInstanceId = identifierFactory<"connector-instance">();
export type CredentialReferenceId = ArkIdentifier<"credential-reference">;
export const CredentialReferenceId = identifierFactory<"credential-reference">();
export type BrowserProfileReferenceId = ArkIdentifier<"browser-profile-reference">;
export const BrowserProfileReferenceId = identifierFactory<"browser-profile-reference">();
export type CaptureRunId = ArkIdentifier<"capture-run">;
export const CaptureRunId = identifierFactory<"capture-run">();
export type CaptureStreamRunId = ArkIdentifier<"capture-stream-run">;
export const CaptureStreamRunId = identifierFactory<"capture-stream-run">();
export type CaptureCursorId = ArkIdentifier<"capture-cursor">;
export const CaptureCursorId = identifierFactory<"capture-cursor">();
export type RawRecordEnvelopeId = ArkIdentifier<"raw-record-envelope">;
export const RawRecordEnvelopeId = identifierFactory<"raw-record-envelope">();
export type SourceSchemaVersionId = ArkIdentifier<"source-schema-version">;
export const SourceSchemaVersionId = identifierFactory<"source-schema-version">();
export type EntityId = ArkIdentifier<"entity">;
export const EntityId = identifierFactory<"entity">();
export type EntityVersionId = ArkIdentifier<"entity-version">;
export const EntityVersionId = identifierFactory<"entity-version">();
export type RelationshipId = ArkIdentifier<"relationship">;
export const RelationshipId = identifierFactory<"relationship">();
export type ArtifactId = ArkIdentifier<"artifact">;
export const ArtifactId = identifierFactory<"artifact">();
export type ArtifactVersionId = ArkIdentifier<"artifact-version">;
export const ArtifactVersionId = identifierFactory<"artifact-version">();
export type ProvenanceEdgeId = ArkIdentifier<"provenance-edge">;
export const ProvenanceEdgeId = identifierFactory<"provenance-edge">();
export type CapabilityId = ArkIdentifier<"capability">;
export const CapabilityId = identifierFactory<"capability">();
export type CapabilityVersionId = ArkIdentifier<"capability-version">;
export const CapabilityVersionId = identifierFactory<"capability-version">();
export type VerifierSpecId = ArkIdentifier<"verifier-spec">;
export const VerifierSpecId = identifierFactory<"verifier-spec">();
export type RecoveryBuildId = ArkIdentifier<"recovery-build">;
export const RecoveryBuildId = identifierFactory<"recovery-build">();
export type RecoveryBuildInputId = ArkIdentifier<"recovery-build-input">;
export const RecoveryBuildInputId = identifierFactory<"recovery-build-input">();
export type DrillScenarioId = ArkIdentifier<"drill-scenario">;
export const DrillScenarioId = identifierFactory<"drill-scenario">();
export type DrillRunId = ArkIdentifier<"drill-run">;
export const DrillRunId = identifierFactory<"drill-run">();
export type DrillStepId = ArkIdentifier<"drill-step">;
export const DrillStepId = identifierFactory<"drill-step">();
export type EvidenceItemId = ArkIdentifier<"evidence-item">;
export const EvidenceItemId = identifierFactory<"evidence-item">();
export type EvidenceManifestId = ArkIdentifier<"evidence-manifest">;
export const EvidenceManifestId = identifierFactory<"evidence-manifest">();
export type IncidentId = ArkIdentifier<"incident">;
export const IncidentId = identifierFactory<"incident">();
export type IncidentMemberId = ArkIdentifier<"incident-member">;
export const IncidentMemberId = identifierFactory<"incident-member">();
export type RecoveryEventId = ArkIdentifier<"recovery-event">;
export const RecoveryEventId = identifierFactory<"recovery-event">();
export type ReconciliationItemId = ArkIdentifier<"reconciliation-item">;
export const ReconciliationItemId = identifierFactory<"reconciliation-item">();
export type ApprovalId = ArkIdentifier<"approval">;
export const ApprovalId = identifierFactory<"approval">();
export type AuditEventId = ArkIdentifier<"audit-event">;
export const AuditEventId = identifierFactory<"audit-event">();
export type DomainEventId = ArkIdentifier<"domain-event">;
export const DomainEventId = identifierFactory<"domain-event">();
export type SolariResourceId = ArkIdentifier<"solari-resource">;
export const SolariResourceId = identifierFactory<"solari-resource">();
export type StateTransitionId = ArkIdentifier<"state-transition">;
export const StateTransitionId = identifierFactory<"state-transition">();
