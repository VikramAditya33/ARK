import { z } from "zod";

import { ConfigValidationError, configErrorFromZod } from "./errors.js";

const emptyToUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const optionalSecret = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  OBJECT_STORE_ENDPOINT: z.url(),
  OBJECT_STORE_REGION: z.string().min(1),
  OBJECT_STORE_BUCKET: z.string().min(1),
  OBJECT_STORE_ACCESS_KEY_ID: z.string().min(1),
  OBJECT_STORE_SECRET_ACCESS_KEY: z.string().min(1),
  SOLARI_API_KEY: z.preprocess(emptyToUndefined, z.string().startsWith("slr_").min(12).optional()),
  SOLARI_BASE_URL: z.url().default("https://api.getsolari.com"),
  SOLARI_MAX_CONCURRENCY: z.coerce.number().int().positive().max(150).default(3),
  SOLARI_MAX_SESSION_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .default(10),
  SOLARI_MAX_RUN_CREDITS: z.coerce.number().positive().max(1_000).default(2),
  ENCRYPTION_MASTER_KEY_REF: z.string().min(1),
  TRUSTED_ORIGINS: z.string().min(1),
  OPENAI_API_KEY: optionalSecret,
  ANTHROPIC_API_KEY: optionalSecret,
});

const databaseEnvironmentSchema = serverEnvironmentSchema.pick({ DATABASE_URL: true });

export type ServerConfig = Readonly<{
  environment: "development" | "test" | "production";
  databaseUrl: string;
  redisUrl: string;
  objectStore: Readonly<{
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  }>;
  solari: Readonly<{
    apiKey: string | undefined;
    baseUrl: string;
    maxConcurrency: number;
    maxSessionMinutes: number;
    maxRunCredits: number;
  }>;
  encryptionMasterKeyRef: string;
  trustedOrigins: readonly string[];
  ai: Readonly<{
    openAiApiKey: string | undefined;
    anthropicApiKey: string | undefined;
  }>;
}>;

export function parseServerConfig(environment: NodeJS.ProcessEnv): ServerConfig {
  const result = serverEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    throw configErrorFromZod(result.error);
  }

  const trustedOrigins = result.data.TRUSTED_ORIGINS.split(",").map((origin) => {
    const normalized = origin.trim();
    try {
      return new URL(normalized).origin;
    } catch {
      throw new ConfigValidationError(["TRUSTED_ORIGINS"]);
    }
  });

  return {
    environment: result.data.NODE_ENV,
    databaseUrl: result.data.DATABASE_URL,
    redisUrl: result.data.REDIS_URL,
    objectStore: {
      endpoint: result.data.OBJECT_STORE_ENDPOINT,
      region: result.data.OBJECT_STORE_REGION,
      bucket: result.data.OBJECT_STORE_BUCKET,
      accessKeyId: result.data.OBJECT_STORE_ACCESS_KEY_ID,
      secretAccessKey: result.data.OBJECT_STORE_SECRET_ACCESS_KEY,
    },
    solari: {
      apiKey: result.data.SOLARI_API_KEY,
      baseUrl: result.data.SOLARI_BASE_URL,
      maxConcurrency: result.data.SOLARI_MAX_CONCURRENCY,
      maxSessionMinutes: result.data.SOLARI_MAX_SESSION_MINUTES,
      maxRunCredits: result.data.SOLARI_MAX_RUN_CREDITS,
    },
    encryptionMasterKeyRef: result.data.ENCRYPTION_MASTER_KEY_REF,
    trustedOrigins,
    ai: {
      openAiApiKey: result.data.OPENAI_API_KEY,
      anthropicApiKey: result.data.ANTHROPIC_API_KEY,
    },
  };
}

export function parseDatabaseConfig(environment: NodeJS.ProcessEnv): Readonly<{
  databaseUrl: string;
}> {
  const result = databaseEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    throw configErrorFromZod(result.error);
  }
  return { databaseUrl: result.data.DATABASE_URL };
}

export function requireSolariApiKey(config: ServerConfig): string {
  if (!config.solari.apiKey) {
    throw new Error("SOLARI_API_KEY is required for this operation");
  }
  return config.solari.apiKey;
}
