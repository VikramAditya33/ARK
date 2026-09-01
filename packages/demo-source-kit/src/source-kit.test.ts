// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  OutageController,
  createSessionValue,
  evaluateOutage,
  hasValidSession,
  isAuthorized,
  paginate,
  toCsv,
} from "./index.js";

describe("controlled source kit", () => {
  it("authenticates exact bearer tokens", () => {
    expect(isAuthorized("Bearer local-user", "local-user")).toBe(true);
    expect(isAuthorized("Bearer local-admin", "local-user")).toBe(false);
    expect(isAuthorized(undefined, "local-user")).toBe(false);
  });

  it("evaluates every failure boundary without leaking state", () => {
    const controller = new OutageController();
    controller.set("total");
    expect(
      evaluateOutage(controller.get(), { method: "GET", resource: "api" }).failure,
    ).toMatchObject({ statusCode: 503 });
    controller.set("read_only");
    expect(
      evaluateOutage(controller.get(), { method: "POST", resource: "api" }).failure,
    ).toMatchObject({ statusCode: 423 });
    expect(
      evaluateOutage(controller.get(), { method: "GET", resource: "api" }).failure,
    ).toBeUndefined();
    controller.set("schema_change");
    expect(evaluateOutage(controller.get(), { method: "GET", resource: "api" }).schemaVersion).toBe(
      2,
    );
  });

  it("paginates deterministically and caps page size", () => {
    expect(paginate([1, 2, 3, 4], 2, 2)).toEqual({
      data: [3, 4],
      page: 2,
      pageSize: 2,
      total: 4,
      totalPages: 2,
    });
    expect(paginate([1], 1, 500).pageSize).toBe(100);
  });

  it("escapes commas, quotes, and newlines in CSV", () => {
    expect(toCsv(["id", "name"], [["1", 'Acme, "Global"']])).toBe(
      'id,name\n1,"Acme, ""Global"""\n',
    );
  });

  it("creates signed browser sessions without placing the token in the cookie", () => {
    const value = createSessionValue("local-user-token", "demo-crm");
    expect(value).not.toContain("local-user-token");
    expect(
      hasValidSession(
        `demo_session=${encodeURIComponent(value)}`,
        "demo_session",
        "local-user-token",
        "demo-crm",
      ),
    ).toBe(true);
    expect(
      hasValidSession("demo_session=forged", "demo_session", "local-user-token", "demo-crm"),
    ).toBe(false);
  });
});
