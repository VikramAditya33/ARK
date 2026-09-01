import { z } from "zod";

import { configErrorFromZod } from "./errors.js";

const publicEnvironmentSchema = z.object({
  PUBLIC_API_ORIGIN: z.url(),
  PUBLIC_APP_ORIGIN: z.url(),
  PUBLIC_APP_VERSION: z.string().min(1).default("0.0.0"),
});

export type PublicConfig = Readonly<{
  apiOrigin: string;
  appOrigin: string;
  appVersion: string;
}>;

export function parsePublicConfig(environment: Record<string, string | undefined>): PublicConfig {
  const result = publicEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    throw configErrorFromZod(result.error);
  }

  return {
    apiOrigin: new URL(result.data.PUBLIC_API_ORIGIN).origin,
    appOrigin: new URL(result.data.PUBLIC_APP_ORIGIN).origin,
    appVersion: result.data.PUBLIC_APP_VERSION,
  };
}
