// SPDX-License-Identifier: MIT

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";

import { createCrmFixtures } from "./fixtures.js";

type SqlRecord = Record<string, unknown>;

function all<Row extends SqlRecord>(
  statement: StatementSync,
  ...parameters: SQLInputValue[]
): readonly Row[] {
  return statement.all(...parameters) as Row[];
}

function get<Row extends SqlRecord>(
  statement: StatementSync,
  ...parameters: SQLInputValue[]
): Row | null {
  return (statement.get(...parameters) as Row | undefined) ?? null;
}

export class DemoCrmDatabase {
  readonly connection: DatabaseSync;

  constructor(path = ":memory:") {
    if (path !== ":memory:") {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.connection = new DatabaseSync(path);
    this.connection.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    this.#initialize();
    this.#seed();
  }

  #initialize(): void {
    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        status TEXT NOT NULL,
        account_owner_id TEXT NOT NULL REFERENCES employees(id),
        custom_fields TEXT NOT NULL,
        archived_at TEXT,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        role TEXT
      );
      CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        name TEXT NOT NULL,
        stage TEXT NOT NULL,
        renewal_date TEXT NOT NULL,
        annual_value INTEGER NOT NULL,
        currency TEXT NOT NULL,
        custom_fields TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS crm_customers_name_idx ON customers(name);
      CREATE INDEX IF NOT EXISTS crm_contacts_customer_idx ON contacts(customer_id);
      CREATE INDEX IF NOT EXISTS crm_deals_customer_renewal_idx ON deals(customer_id, renewal_date);
    `);
  }

  #seed(): void {
    const count = get<{ count: number }>(
      this.connection.prepare("SELECT count(*) AS count FROM customers"),
    )?.count;
    if (count && count > 0) {
      return;
    }

    const fixtures = createCrmFixtures();
    this.connection.exec("BEGIN IMMEDIATE");
    try {
      const organization = this.connection.prepare(
        "INSERT INTO organizations (id, name) VALUES (?, ?)",
      );
      for (const row of fixtures.organizations) organization.run(row.id, row.name);

      const employee = this.connection.prepare(
        "INSERT INTO employees (id, name, email, role) VALUES (?, ?, ?, ?)",
      );
      for (const row of fixtures.employees) employee.run(row.id, row.name, row.email, row.role);

      const customer = this.connection.prepare(`
        INSERT INTO customers
          (id, name, domain, status, account_owner_id, custom_fields, archived_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.customers) {
        customer.run(
          row.id,
          row.name,
          row.domain,
          row.status,
          row.accountOwnerId,
          row.customFields,
          row.archivedAt,
          row.deletedAt,
        );
      }

      const contact = this.connection.prepare(`
        INSERT INTO contacts (id, customer_id, name, email, phone, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.contacts) {
        contact.run(row.id, row.customerId, row.name, row.email, row.phone, row.role);
      }

      const deal = this.connection.prepare(`
        INSERT INTO deals
          (id, customer_id, name, stage, renewal_date, annual_value, currency, custom_fields, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.deals) {
        deal.run(
          row.id,
          row.customerId,
          row.name,
          row.stage,
          row.renewalDate,
          row.annualValue,
          row.currency,
          row.customFields,
          row.deletedAt,
        );
      }

      const audit = this.connection.prepare(`
        INSERT INTO audit_events (id, actor, action, record_type, record_id, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.auditEvents) {
        audit.run(row.id, row.actor, row.action, row.recordType, row.recordId, row.occurredAt);
      }
      this.connection.exec("COMMIT");
    } catch (error: unknown) {
      this.connection.exec("ROLLBACK");
      throw error;
    }
  }

  counts(): Readonly<Record<string, number>> {
    const count = (table: string): number =>
      get<{ count: number }>(this.connection.prepare(`SELECT count(*) AS count FROM ${table}`))
        ?.count ?? 0;
    const demoPeriodRenewals = get<{ count: number }>(
      this.connection.prepare(
        "SELECT count(*) AS count FROM deals WHERE renewal_date BETWEEN '2026-09-01' AND '2026-09-30' AND deleted_at IS NULL",
      ),
    )?.count;
    return {
      organizations: count("organizations"),
      employees: count("employees"),
      customers: count("customers"),
      contacts: count("contacts"),
      deals: count("deals"),
      demoPeriodRenewals: demoPeriodRenewals ?? 0,
      auditEvents: count("audit_events"),
    };
  }

  customers(): readonly SqlRecord[] {
    return all(
      this.connection.prepare(`
        SELECT c.*, e.name AS account_owner_name, e.email AS account_owner_email
        FROM customers c
        JOIN employees e ON e.id = c.account_owner_id
        ORDER BY c.id
      `),
    );
  }

  customer(id: string): SqlRecord | null {
    const customer = get(
      this.connection.prepare(`
        SELECT c.*, e.name AS account_owner_name, e.email AS account_owner_email
        FROM customers c
        JOIN employees e ON e.id = c.account_owner_id
        WHERE c.id = ?
      `),
      id,
    );
    if (!customer) return null;
    return {
      ...customer,
      custom_fields: JSON.parse(String(customer.custom_fields)) as SqlRecord,
      contacts: all(
        this.connection.prepare("SELECT * FROM contacts WHERE customer_id = ? ORDER BY id"),
        id,
      ),
      deals: all(
        this.connection.prepare("SELECT * FROM deals WHERE customer_id = ? ORDER BY id"),
        id,
      ).map((deal) => ({
        ...deal,
        custom_fields: JSON.parse(String(deal.custom_fields)) as SqlRecord,
      })),
    };
  }

  contacts(): readonly SqlRecord[] {
    return all(this.connection.prepare("SELECT * FROM contacts ORDER BY id"));
  }

  deals(): readonly SqlRecord[] {
    return all(this.connection.prepare("SELECT * FROM deals ORDER BY renewal_date, id")).map(
      (deal) => ({
        ...deal,
        custom_fields: JSON.parse(String(deal.custom_fields)) as SqlRecord,
      }),
    );
  }

  organizations(): readonly SqlRecord[] {
    return all(this.connection.prepare("SELECT * FROM organizations ORDER BY id"));
  }

  auditEvents(): readonly SqlRecord[] {
    return all(this.connection.prepare("SELECT * FROM audit_events ORDER BY occurred_at, id"));
  }

  appendAuditEvent(
    input: Readonly<{ actor: string; action: string; recordId: string }>,
  ): SqlRecord {
    if (!this.customer(input.recordId)) {
      throw new Error("Customer not found.");
    }
    const event = {
      id: `audit_${randomUUID()}`,
      actor: input.actor,
      action: input.action,
      record_type: "customer",
      record_id: input.recordId,
      occurred_at: new Date().toISOString(),
    };
    this.connection
      .prepare(
        "INSERT INTO audit_events (id, actor, action, record_type, record_id, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        event.id,
        event.actor,
        event.action,
        event.record_type,
        event.record_id,
        event.occurred_at,
      );
    return event;
  }

  close(): void {
    this.connection.close();
  }
}
