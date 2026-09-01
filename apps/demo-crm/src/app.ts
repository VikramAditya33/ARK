// SPDX-License-Identifier: MIT

import {
  OUTAGE_MODES,
  OutageController,
  applyDelay,
  clearSessionCookie,
  escapeHtml,
  evaluateOutage,
  hasValidSession,
  isAuthorized,
  localLoginPage,
  paginate,
  sessionCookie,
  toCsv,
  type OutageMode,
} from "@ark/demo-source-kit";
import Fastify, { type FastifyInstance } from "fastify";

import { CRM_SOURCE_CONTRACT } from "./contract.js";
import { DemoCrmDatabase } from "./database.js";

export type DemoCrmOptions = Readonly<{
  databasePath?: string;
  userToken?: string;
  adminToken?: string;
  enableAdminControls?: boolean;
  outageController?: OutageController;
}>;

type Query = Record<string, string | undefined>;
type Row = Record<string, unknown>;

const numberParameter = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resourceFor = (url: string): "api" | "export" | "ui" =>
  url.startsWith("/api/export/") ? "export" : url.startsWith("/api/") ? "api" : "ui";

function changedSchema(row: Row): Row {
  const { status, account_owner_id, ...rest } = row;
  return { ...rest, lifecycle_state: status, owner_reference: account_owner_id };
}

function customerListHtml(rows: readonly Row[]): string {
  const items = rows
    .map(
      (row) => `
        <li data-testid="customer-row">
          <a href="/customers/${escapeHtml(row.id)}">${escapeHtml(row.name)}</a>
          <span>${escapeHtml(row.status)}</span>
        </li>`,
    )
    .join("");
  return `<!doctype html>
    <html><head><title>Demo CRM</title></head><body>
      <main>
        <h1>Customers</h1>
        <form method="get"><label>Search <input name="q" /></label><button>Search</button></form>
        <ul>${items}</ul>
      </main>
    </body></html>`;
}

function customerDetailHtml(customer: Row): string {
  const deals = (customer.deals as readonly Row[])
    .filter((deal) => deal.deleted_at === null)
    .map(
      (deal) => `<li data-testid="deal-row">
        <strong>${escapeHtml(deal.name)}</strong>
        <span data-testid="renewal-date">${escapeHtml(deal.renewal_date)}</span>
        <span data-testid="annual-value">${escapeHtml(deal.annual_value)} ${escapeHtml(deal.currency)}</span>
      </li>`,
    )
    .join("");
  const contacts = (customer.contacts as readonly Row[])
    .map((contact) => `<li>${escapeHtml(contact.name)} — ${escapeHtml(contact.email)}</li>`)
    .join("");
  return `<!doctype html>
    <html><head><title>${escapeHtml(customer.name)} · Demo CRM</title></head><body>
      <main data-testid="customer-detail">
        <a href="/">Customers</a>
        <h1>${escapeHtml(customer.name)}</h1>
        <p>Lifecycle: <span data-testid="customer-status">${escapeHtml(customer.status)}</span></p>
        <p>Account owner: <span data-testid="account-owner">${escapeHtml(customer.account_owner_name)}</span>
          &lt;${escapeHtml(customer.account_owner_email)}&gt;</p>
        <h2>Deals</h2><ul>${deals}</ul>
        <h2>Contacts</h2><ul>${contacts}</ul>
      </main>
    </body></html>`;
}

export function buildDemoCrmApp(options: DemoCrmOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const database = new DemoCrmDatabase(options.databasePath);
  const outage = options.outageController ?? new OutageController();
  const userToken = options.userToken ?? "demo-crm-user";
  const adminToken = options.adminToken ?? "demo-crm-admin";
  const enableAdminControls = options.enableAdminControls ?? process.env.NODE_ENV !== "production";
  const cookieName = "demo_crm_session";

  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health" || request.url === "/login") return;
    if (request.url.startsWith("/admin/")) {
      if (!isAuthorized(request.headers.authorization, adminToken)) {
        return reply
          .code(401)
          .send({ code: "ADMIN_AUTH_REQUIRED", message: "Admin authentication required." });
      }
      return;
    }
    const authenticated =
      isAuthorized(request.headers.authorization, userToken) ||
      hasValidSession(request.headers.cookie, cookieName, userToken, "demo-crm");
    if (!authenticated) {
      return request.url.startsWith("/api/")
        ? reply.code(401).send({ code: "AUTH_REQUIRED", message: "Authentication required." })
        : reply.redirect("/login");
    }

    const effect = evaluateOutage(outage.get(), {
      method: request.method,
      resource: resourceFor(request.url),
    });
    await applyDelay(effect.delayMs);
    reply.header("x-demo-schema-version", String(effect.schemaVersion));
    if (effect.failure) {
      return reply.code(effect.failure.statusCode).send(effect.failure);
    }
  });

  app.get("/health", async () => ({ source: "demo-crm", status: "ok" }));
  app.get("/login", async (_request, reply) =>
    reply.type("text/html; charset=utf-8").send(localLoginPage("Demo CRM")),
  );
  app.post("/login", async (request, reply) => {
    const body = request.body as { token?: unknown } | null;
    if (typeof body?.token !== "string" || !isAuthorized(`Bearer ${body.token}`, userToken)) {
      return reply.code(401).send({ code: "INVALID_LOCAL_TOKEN" });
    }
    return reply
      .header("set-cookie", sessionCookie(cookieName, userToken, "demo-crm"))
      .code(204)
      .send();
  });
  app.get("/logout", async (_request, reply) =>
    reply.header("set-cookie", clearSessionCookie(cookieName)).redirect("/login"),
  );

  app.get("/admin/outage", async (_request, reply) =>
    enableAdminControls ? outage.get() : reply.code(404).send({ code: "NOT_FOUND" }),
  );
  app.put("/admin/outage", async (request, reply) => {
    if (!enableAdminControls) return reply.code(404).send({ code: "NOT_FOUND" });
    const body = request.body as { mode?: unknown; delayMs?: unknown } | null;
    const mode = body?.mode;
    if (typeof mode !== "string" || !OUTAGE_MODES.includes(mode as OutageMode)) {
      return reply.code(400).send({ code: "INVALID_OUTAGE_MODE" });
    }
    const delayMs = typeof body?.delayMs === "number" ? body.delayMs : undefined;
    return delayMs === undefined
      ? outage.set(mode as OutageMode)
      : outage.set(mode as OutageMode, delayMs);
  });
  app.delete("/admin/outage", async (_request, reply) =>
    enableAdminControls ? outage.reset() : reply.code(404).send({ code: "NOT_FOUND" }),
  );

  app.get("/api/source-contract", async () => CRM_SOURCE_CONTRACT);
  app.get("/api/organizations", async () => ({ data: database.organizations() }));
  app.get("/api/customers", async (request, reply) => {
    const query = request.query as Query;
    const search = query.q?.trim().toLowerCase();
    const status = query.status?.trim().toLowerCase();
    let rows = database.customers();
    if (search) {
      rows = rows.filter(
        (row) =>
          String(row.name).toLowerCase().includes(search) ||
          String(row.domain).toLowerCase().includes(search),
      );
    }
    if (status) rows = rows.filter((row) => String(row.status).toLowerCase() === status);
    const page = paginate(
      rows,
      numberParameter(query.page, 1),
      numberParameter(query.pageSize, 20),
    );
    const schemaVersion = Number(reply.getHeader("x-demo-schema-version") ?? 1);
    return schemaVersion === 2 ? { ...page, data: page.data.map(changedSchema) } : page;
  });
  app.get("/api/customers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = database.customer(id);
    if (!row) return reply.code(404).send({ code: "CUSTOMER_NOT_FOUND" });
    return Number(reply.getHeader("x-demo-schema-version") ?? 1) === 2 ? changedSchema(row) : row;
  });
  app.get("/api/contacts", async (request) => {
    const query = request.query as Query;
    const customerId = query.customerId;
    const rows = customerId
      ? database.contacts().filter((row) => row.customer_id === customerId)
      : database.contacts();
    return paginate(rows, numberParameter(query.page, 1), numberParameter(query.pageSize, 20));
  });
  app.get("/api/deals", async (request) => {
    const query = request.query as Query;
    let rows = database.deals();
    if (query.customerId) rows = rows.filter((row) => row.customer_id === query.customerId);
    if (query.stage) rows = rows.filter((row) => row.stage === query.stage);
    if (query.renewalFrom)
      rows = rows.filter((row) => String(row.renewal_date) >= query.renewalFrom!);
    if (query.renewalTo) rows = rows.filter((row) => String(row.renewal_date) <= query.renewalTo!);
    return paginate(rows, numberParameter(query.page, 1), numberParameter(query.pageSize, 20));
  });
  app.get("/api/audit-events", async (request) => {
    const query = request.query as Query;
    return paginate(
      database.auditEvents(),
      numberParameter(query.page, 1),
      numberParameter(query.pageSize, 20),
    );
  });
  app.post("/api/customers/:id/activity", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { actor?: unknown; action?: unknown } | null;
    if (typeof body?.actor !== "string" || typeof body.action !== "string") {
      return reply.code(400).send({ code: "INVALID_ACTIVITY" });
    }
    try {
      return reply
        .code(201)
        .send(database.appendAuditEvent({ actor: body.actor, action: body.action, recordId: id }));
    } catch {
      return reply.code(404).send({ code: "CUSTOMER_NOT_FOUND" });
    }
  });
  app.get("/api/export/customers.csv", async (_request, reply) => {
    const effect = evaluateOutage(outage.get(), { method: "GET", resource: "export" });
    reply.type("text/csv; charset=utf-8");
    if (effect.corruptExport) return 'id,name\ncust_001,"unterminated';

    const rows = database.customers().map((customer) => {
      const renewalDeal = database
        .deals()
        .find((deal) => deal.customer_id === customer.id && deal.deleted_at === null);
      return [
        customer.id,
        customer.name,
        customer.status,
        customer.domain,
        renewalDeal?.renewal_date,
        renewalDeal?.annual_value,
        renewalDeal?.currency,
      ];
    });
    return toCsv(CRM_SOURCE_CONTRACT.exports.customersCsv.includedFields, rows);
  });

  app.get("/", async (request, reply) => {
    const query = request.query as Query;
    const search = query.q?.trim().toLowerCase();
    const rows = search
      ? database.customers().filter((row) => String(row.name).toLowerCase().includes(search))
      : database.customers().slice(0, 20);
    return reply.type("text/html; charset=utf-8").send(customerListHtml(rows));
  });
  app.get("/customers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = database.customer(id);
    if (!customer) return reply.code(404).type("text/html").send("Customer not found");
    return reply.type("text/html; charset=utf-8").send(customerDetailHtml(customer));
  });

  app.addHook("onClose", async () => database.close());
  return app;
}
