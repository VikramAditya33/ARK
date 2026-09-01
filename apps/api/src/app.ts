import Fastify, { type FastifyInstance } from "fastify";

export type FoundationStatus = Readonly<{
  service: "ark-api";
  status: "ok";
  phase: 1;
}>;

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async (): Promise<FoundationStatus> => ({
    service: "ark-api",
    status: "ok",
    phase: 1,
  }));

  app.get("/ready", async (): Promise<FoundationStatus> => ({
    service: "ark-api",
    status: "ok",
    phase: 1,
  }));

  return app;
}
