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

import { OPS_SOURCE_CONTRACT } from "./contract.js";
import { DemoOpsDatabase } from "./database.js";

export type DemoOpsOptions = Readonly<{
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

const resourceFor = (url: string): "api" | "export" | "attachment" | "ui" => {
  if (url.startsWith("/api/export/")) return "export";
  if (url.includes("/attachments/") && url.endsWith("/download")) return "attachment";
  return url.startsWith("/api/") ? "api" : "ui";
};

function changedIssueSchema(row: Row): Row {
  const { severity, due_date, ...rest } = row;
  return { ...rest, priority: severity, target_date: due_date };
}

function opsHomeHtml(contracts: readonly Row[], issues: readonly Row[]): string {
  const contractRows = contracts
    .slice(0, 20)
    .map(
      (contract) => `<li data-testid="contract-row">
        <a href="/contracts/${escapeHtml(contract.id)}">${escapeHtml(contract.title)}</a>
        <span>${escapeHtml(contract.status)}</span>
      </li>`,
    )
    .join("");
  const issueRows = issues
    .slice(0, 20)
    .map(
      (issue) => `<li data-testid="issue-row">
        <a href="/issues/${escapeHtml(issue.id)}">${escapeHtml(issue.title)}</a>
        <span>${escapeHtml(issue.severity)} / ${escapeHtml(issue.state)}</span>
      </li>`,
    )
    .join("");
  return `<!doctype html>
    <html><head><title>Demo Ops</title></head><body><main>
      <h1>Contracts and delivery operations</h1>
      <form method="get"><label>Customer ID <input name="customerId" /></label><button>Find</button></form>
      <h2>Contracts</h2><ul>${contractRows}</ul>
      <h2>Issues</h2><ul>${issueRows}</ul>
    </main></body></html>`;
}

function customerOpsHtml(
  customerId: string,
  contracts: readonly Row[],
  issues: readonly Row[],
): string {
  const contractsHtml = contracts
    .map(
      (contract) => `<li data-testid="customer-contract">
        <a href="/contracts/${escapeHtml(contract.id)}">${escapeHtml(contract.title)}</a>
        <span data-testid="contract-renewal-date">${escapeHtml(contract.renewal_date)}</span>
        <span data-testid="contract-checksum">${escapeHtml(contract.attachment_checksum)}</span>
      </li>`,
    )
    .join("");
  const issuesHtml = issues
    .filter((issue) => issue.deleted_at === null)
    .map(
      (
        issue,
      ) => `<li data-testid="customer-issue" data-severity="${escapeHtml(issue.severity)}" data-state="${escapeHtml(issue.state)}">
        <a href="/issues/${escapeHtml(issue.id)}">${escapeHtml(issue.title)}</a>
        <span>${escapeHtml(issue.severity)} / ${escapeHtml(issue.state)}</span>
      </li>`,
    )
    .join("");
  return `<!doctype html>
    <html><head><title>${escapeHtml(customerId)} · Demo Ops</title></head><body>
      <main data-testid="customer-operations">
        <a href="/">Operations</a><h1>Customer ${escapeHtml(customerId)}</h1>
        <h2>Contracts</h2><ul>${contractsHtml}</ul>
        <h2>Delivery issues</h2><ul>${issuesHtml}</ul>
      </main>
    </body></html>`;
}

export function buildDemoOpsApp(options: DemoOpsOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const database = new DemoOpsDatabase(options.databasePath);
  const outage = options.outageController ?? new OutageController();
  const userToken = options.userToken ?? "demo-ops-user";
  const adminToken = options.adminToken ?? "demo-ops-admin";
  const enableAdminControls = options.enableAdminControls ?? process.env.NODE_ENV !== "production";
  const cookieName = "demo_ops_session";

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
      hasValidSession(request.headers.cookie, cookieName, userToken, "demo-ops");
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
    if (effect.failure) return reply.code(effect.failure.statusCode).send(effect.failure);
  });

  app.get("/health", async () => ({ source: "demo-ops", status: "ok" }));
  app.get("/login", async (_request, reply) =>
    reply.type("text/html; charset=utf-8").send(localLoginPage("Demo Ops")),
  );
  app.post("/login", async (request, reply) => {
    const body = request.body as { token?: unknown } | null;
    if (typeof body?.token !== "string" || !isAuthorized(`Bearer ${body.token}`, userToken)) {
      return reply.code(401).send({ code: "INVALID_LOCAL_TOKEN" });
    }
    return reply
      .header("set-cookie", sessionCookie(cookieName, userToken, "demo-ops"))
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

  app.get("/api/source-contract", async () => OPS_SOURCE_CONTRACT);
  app.get("/api/contracts", async (request) => {
    const query = request.query as Query;
    const search = query.q?.trim().toLowerCase();
    let rows = database.contracts();
    if (query.customerId) rows = rows.filter((row) => row.customer_id === query.customerId);
    if (query.status) rows = rows.filter((row) => row.status === query.status);
    if (search) rows = rows.filter((row) => String(row.title).toLowerCase().includes(search));
    return paginate(rows, numberParameter(query.page, 1), numberParameter(query.pageSize, 20));
  });
  app.get("/api/contracts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const contract = database.contract(id);
    return contract ?? reply.code(404).send({ code: "CONTRACT_NOT_FOUND" });
  });
  app.get("/api/issues", async (request, reply) => {
    const query = request.query as Query;
    const search = query.q?.trim().toLowerCase();
    let rows = database.issues();
    if (query.customerId) rows = rows.filter((row) => row.customer_id === query.customerId);
    if (query.severity) rows = rows.filter((row) => row.severity === query.severity);
    if (query.state) rows = rows.filter((row) => row.state === query.state);
    if (search) rows = rows.filter((row) => String(row.title).toLowerCase().includes(search));
    const page = paginate(
      rows,
      numberParameter(query.page, 1),
      numberParameter(query.pageSize, 20),
    );
    return Number(reply.getHeader("x-demo-schema-version") ?? 1) === 2
      ? { ...page, data: page.data.map(changedIssueSchema) }
      : page;
  });
  app.get("/api/issues/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const issue = database.issue(id);
    if (!issue) return reply.code(404).send({ code: "ISSUE_NOT_FOUND" });
    return Number(reply.getHeader("x-demo-schema-version") ?? 1) === 2
      ? changedIssueSchema(issue)
      : issue;
  });
  app.post("/api/issues/:id/comments", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { body?: unknown } | null;
    if (typeof body?.body !== "string" || body.body.trim().length === 0) {
      return reply.code(400).send({ code: "INVALID_COMMENT" });
    }
    try {
      return reply.code(201).send(database.appendComment(id, body.body.trim()));
    } catch {
      return reply.code(404).send({ code: "ISSUE_NOT_FOUND" });
    }
  });
  app.get("/api/attachments/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    const attachment = database.attachment(id);
    if (!attachment) return reply.code(404).send({ code: "ATTACHMENT_NOT_FOUND" });
    reply.header("content-disposition", `attachment; filename="${attachment.filename}"`);
    reply.header("x-content-sha256", attachment.checksum);
    return reply.type(attachment.mediaType).send(Buffer.from(attachment.content));
  });
  app.get("/api/export/contracts.csv", async (_request, reply) => {
    const effect = evaluateOutage(outage.get(), { method: "GET", resource: "export" });
    reply.type("text/csv; charset=utf-8");
    if (effect.corruptExport) return "id,customer_id\ncontract_001,wrong-column-count,unexpected";
    return toCsv(
      OPS_SOURCE_CONTRACT.exports.contractsCsv.includedFields,
      database
        .contracts()
        .map((row) => [row.id, row.customer_id, row.title, row.status, row.renewal_date]),
    );
  });

  app.get("/", async (request, reply) => {
    const query = request.query as Query;
    const customerId = query.customerId;
    const contracts = customerId
      ? database.contracts().filter((row) => row.customer_id === customerId)
      : database.contracts();
    const issues = customerId
      ? database.issues().filter((row) => row.customer_id === customerId)
      : database.issues();
    return reply.type("text/html; charset=utf-8").send(opsHomeHtml(contracts, issues));
  });
  app.get("/customers/:customerId", async (request, reply) => {
    const { customerId } = request.params as { customerId: string };
    const contracts = database.contracts().filter((row) => row.customer_id === customerId);
    const issues = database.issues().filter((row) => row.customer_id === customerId);
    if (contracts.length === 0 && issues.length === 0) {
      return reply.code(404).type("text/html").send("Customer operations not found");
    }
    return reply
      .type("text/html; charset=utf-8")
      .send(customerOpsHtml(customerId, contracts, issues));
  });
  app.get("/contracts/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const contract = database.contract(id);
    if (!contract) return reply.code(404).type("text/html").send("Contract not found");
    return reply.type("text/html; charset=utf-8").send(`<!doctype html><html><body><main>
      <h1>${escapeHtml(contract.title)}</h1>
      <p>Renewal: ${escapeHtml(contract.renewal_date)}</p>
      <p>Checksum: <span data-testid="attachment-checksum">${escapeHtml(contract.attachment_checksum)}</span></p>
      <a data-testid="attachment-download" href="/api/attachments/${escapeHtml(contract.attachment_id)}/download">Download contract</a>
    </main></body></html>`);
  });
  app.get("/issues/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const issue = database.issue(id);
    if (!issue) return reply.code(404).type("text/html").send("Issue not found");
    return reply.type("text/html; charset=utf-8").send(`<!doctype html><html><body><main>
      <h1>${escapeHtml(issue.title)}</h1>
      <p data-testid="issue-severity">${escapeHtml(issue.severity)}</p>
      <p data-testid="issue-state">${escapeHtml(issue.state)}</p>
      <p>Assignee: ${escapeHtml(issue.assignee_name)}</p>
    </main></body></html>`);
  });

  app.addHook("onClose", async () => database.close());
  return app;
}
