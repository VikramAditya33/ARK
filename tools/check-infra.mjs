#!/usr/bin/env node

import { connect } from "node:net";

function assertTcp(name, host, port) {
  return new Promise((resolvePromise, reject) => {
    const socket = connect({ host, port: Number(port) });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`${name} did not accept TCP connections`));
    }, 3_000);

    socket.once("connect", () => {
      clearTimeout(timeout);
      socket.end();
      resolvePromise();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`${name} is unavailable: ${error.message}`));
    });
  });
}

await Promise.all([
  assertTcp("PostgreSQL", "127.0.0.1", process.env.POSTGRES_PORT ?? "54329"),
  assertTcp("Redis", "127.0.0.1", process.env.REDIS_PORT ?? "63799"),
]);

const minioPort = process.env.MINIO_API_PORT ?? "9009";
const minioResponse = await fetch(`http://127.0.0.1:${minioPort}/minio/health/live`);
if (!minioResponse.ok) {
  throw new Error(`MinIO health check failed with HTTP ${minioResponse.status}`);
}

console.log("Local PostgreSQL, Redis, and MinIO are healthy.");
