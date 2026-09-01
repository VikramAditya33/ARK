// SPDX-License-Identifier: MIT

import { randomUUID } from "node:crypto";

import postgres from "postgres";

export async function withTemporaryDatabase<Result>(
  databaseUrl: string,
  run: (temporaryDatabaseUrl: string) => Promise<Result>,
): Promise<Result> {
  const databaseName = `ark_test_${randomUUID().replaceAll("-", "")}`;
  const administrationUrl = new URL(databaseUrl);
  administrationUrl.pathname = "/postgres";
  const temporaryUrl = new URL(databaseUrl);
  temporaryUrl.pathname = `/${databaseName}`;
  const administrator = postgres(administrationUrl.toString(), {
    max: 1,
    onnotice: () => undefined,
  });

  try {
    await administrator`create database ${administrator(databaseName)}`;
    return await run(temporaryUrl.toString());
  } finally {
    await administrator`
      select pg_terminate_backend(pid)
      from pg_stat_activity
      where datname = ${databaseName} and pid <> pg_backend_pid()
    `;
    await administrator`drop database if exists ${administrator(databaseName)}`;
    await administrator.end({ timeout: 5 });
  }
}
