// SPDX-License-Identifier: MIT

export const OUTAGE_MODES = [
  "none",
  "total",
  "auth_failure",
  "read_only",
  "delay",
  "corrupted_export",
  "missing_attachment",
  "schema_change",
] as const;

export type OutageMode = (typeof OUTAGE_MODES)[number];

export type OutageState = Readonly<{
  mode: OutageMode;
  delayMs: number;
  changedAt: string;
}>;

export type OutageEffect = Readonly<{
  delayMs: number;
  failure?: Readonly<{ statusCode: number; code: string; message: string }>;
  corruptExport: boolean;
  hideAttachment: boolean;
  schemaVersion: 1 | 2;
}>;

export class InvalidOutageConfigurationError extends Error {
  constructor() {
    super("Invalid outage configuration.");
    this.name = "InvalidOutageConfigurationError";
  }
}

export class OutageController {
  #state: OutageState = Object.freeze({
    mode: "none",
    delayMs: 0,
    changedAt: new Date(0).toISOString(),
  });

  get(): OutageState {
    return this.#state;
  }

  set(mode: OutageMode, delayMs = mode === "delay" ? 250 : 0): OutageState {
    if (
      !OUTAGE_MODES.includes(mode) ||
      !Number.isInteger(delayMs) ||
      delayMs < 0 ||
      delayMs > 5_000
    ) {
      throw new InvalidOutageConfigurationError();
    }
    this.#state = Object.freeze({ mode, delayMs, changedAt: new Date().toISOString() });
    return this.#state;
  }

  reset(): OutageState {
    return this.set("none", 0);
  }
}

export function evaluateOutage(
  state: OutageState,
  request: Readonly<{ method: string; resource: "api" | "export" | "attachment" | "ui" }>,
): OutageEffect {
  const write = !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
  const base = {
    delayMs: state.mode === "delay" ? state.delayMs : 0,
    corruptExport: state.mode === "corrupted_export" && request.resource === "export",
    hideAttachment: state.mode === "missing_attachment" && request.resource === "attachment",
    schemaVersion: state.mode === "schema_change" ? (2 as const) : (1 as const),
  };

  if (state.mode === "total") {
    return {
      ...base,
      failure: { statusCode: 503, code: "SOURCE_UNAVAILABLE", message: "Source unavailable." },
    };
  }
  if (state.mode === "auth_failure") {
    return {
      ...base,
      failure: { statusCode: 401, code: "SOURCE_AUTH_FAILURE", message: "Authentication failed." },
    };
  }
  if (state.mode === "read_only" && write) {
    return {
      ...base,
      failure: { statusCode: 423, code: "SOURCE_READ_ONLY", message: "Source is read-only." },
    };
  }
  if (base.hideAttachment) {
    return {
      ...base,
      failure: { statusCode: 404, code: "ATTACHMENT_MISSING", message: "Attachment unavailable." },
    };
  }
  return base;
}

export async function applyDelay(milliseconds: number): Promise<void> {
  if (milliseconds > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }
}
