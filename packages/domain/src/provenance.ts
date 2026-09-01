// SPDX-License-Identifier: MIT

import type {
  ArtifactVersionId,
  CaptureRunId,
  RawRecordEnvelopeId,
  SourceSystemId,
} from "./identifiers.js";

export const CAPTURE_METHODS = [
  "api",
  "export",
  "network",
  "browser",
  "desktop",
  "manual",
] as const;

export type CaptureMethod = (typeof CAPTURE_METHODS)[number];

export type ProvenancePointer = Readonly<{
  sourceSystemId: SourceSystemId;
  captureRunId: CaptureRunId;
  stream: string;
  nativeId: string;
  jsonPointer?: string;
  rawRecordEnvelopeId?: RawRecordEnvelopeId;
  artifactVersionId?: ArtifactVersionId;
  captureMethod: CaptureMethod;
  capturedAt: string;
}>;

export function isCaptureMethod(value: unknown): value is CaptureMethod {
  return typeof value === "string" && (CAPTURE_METHODS as readonly string[]).includes(value);
}

export function assertProvenancePointer(pointer: ProvenancePointer): void {
  if (pointer.stream.trim().length === 0 || pointer.nativeId.trim().length === 0) {
    throw new TypeError("Provenance requires a stream and native identifier.");
  }
  if (Number.isNaN(Date.parse(pointer.capturedAt))) {
    throw new TypeError("Provenance capturedAt must be an ISO timestamp.");
  }
  if (pointer.jsonPointer !== undefined && !pointer.jsonPointer.startsWith("/")) {
    throw new TypeError("Provenance jsonPointer must be an RFC 6901 pointer.");
  }
}
