import { describe, expect, it } from "vitest";

import {
  ConfigValidationError,
  parseDatabaseConfig,
  parseServerConfig,
  requireSolariApiKey,
} from "./index.js";
import { parsePublicConfig } from "./public.js";

const validEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://ark:test@127.0.0.1:54329/ark",
  REDIS_URL: "redis://127.0.0.1:63799",
  OBJECT_STORE_ENDPOINT: "http://127.0.0.1:9009",
  OBJECT_STORE_REGION: "us-east-1",
  OBJECT_STORE_BUCKET: "ark-test",
  OBJECT_STORE_ACCESS_KEY_ID: "test-access",
  OBJECT_STORE_SECRET_ACCESS_KEY: "test-secret-value",
  SOLARI_BASE_URL: "https://api.getsolari.com",
  ENCRYPTION_MASTER_KEY_REF: "test-key-reference",
  TRUSTED_ORIGINS: "http://localhost:3000, http://127.0.0.1:3000/path",
} satisfies NodeJS.ProcessEnv;

describe("server configuration", () => {
  it("parses and normalizes valid settings", () => {
    const config = parseServerConfig(validEnvironment);

    expect(config.environment).toBe("test");
    expect(config.solari.maxConcurrency).toBe(3);
    expect(config.solari.apiKey).toBeUndefined();
    expect(config.trustedOrigins).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"]);
  });

  it("names invalid fields without echoing secret values", () => {
    const secret = "do-not-repeat-this-secret";

    expect(() =>
      parseServerConfig({
        ...validEnvironment,
        OBJECT_STORE_SECRET_ACCESS_KEY: secret,
        DATABASE_URL: "bad",
      }),
    ).toThrowError(ConfigValidationError);

    try {
      parseServerConfig({
        ...validEnvironment,
        OBJECT_STORE_SECRET_ACCESS_KEY: secret,
        DATABASE_URL: "bad",
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect(String(error)).toContain("DATABASE_URL");
      expect(String(error)).not.toContain(secret);
    }
  });

  it("parses database-only configuration", () => {
    expect(parseDatabaseConfig({ DATABASE_URL: validEnvironment.DATABASE_URL })).toEqual({
      databaseUrl: validEnvironment.DATABASE_URL,
    });
  });

  it("requires a Solari key only for Solari operations", () => {
    const config = parseServerConfig(validEnvironment);
    expect(() => requireSolariApiKey(config)).toThrowError(
      "SOLARI_API_KEY is required for this operation",
    );
  });
});

describe("public configuration", () => {
  it("contains only normalized public values", () => {
    expect(
      parsePublicConfig({
        PUBLIC_API_ORIGIN: "https://api.ark.test/v1",
        PUBLIC_APP_ORIGIN: "https://ark.test/dashboard",
        PUBLIC_APP_VERSION: "0.0.0",
      }),
    ).toEqual({
      apiOrigin: "https://api.ark.test",
      appOrigin: "https://ark.test",
      appVersion: "0.0.0",
    });
  });
});
