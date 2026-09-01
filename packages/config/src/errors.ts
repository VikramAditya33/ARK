import type { ZodError } from "zod";

export class ConfigValidationError extends Error {
  readonly fields: readonly string[];

  constructor(fields: readonly string[]) {
    const uniqueFields = [...new Set(fields)].sort();
    super(`Invalid configuration: ${uniqueFields.join(", ")}`);
    this.name = "ConfigValidationError";
    this.fields = uniqueFields;
  }
}

export function configErrorFromZod(error: ZodError): ConfigValidationError {
  const fields = error.issues.map((issue) => issue.path.join(".") || "environment");
  return new ConfigValidationError(fields);
}
