// SPDX-License-Identifier: MIT

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";

import { createOpsFixtures } from "./fixtures.js";

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

export class DemoOpsDatabase {
  readonly connection: DatabaseSync;

  constructor(path = ":memory:") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.connection = new DatabaseSync(path);
    this.connection.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    this.#initialize();
    this.#seed();
  }

  #initialize(): void {
    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        effective_date TEXT NOT NULL,
        renewal_date TEXT NOT NULL,
        owner_id TEXT NOT NULL REFERENCES employees(id),
        archived_at TEXT
      );
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL UNIQUE REFERENCES contracts(id),
        filename TEXT NOT NULL,
        media_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        content BLOB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        title TEXT NOT NULL,
        severity TEXT NOT NULL,
        state TEXT NOT NULL,
        assignee_id TEXT NOT NULL REFERENCES employees(id),
        due_date TEXT,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL REFERENCES issues(id),
        author_id TEXT NOT NULL REFERENCES employees(id),
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL REFERENCES issues(id),
        label TEXT NOT NULL,
        url TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ops_contracts_customer_idx ON contracts(customer_id);
      CREATE INDEX IF NOT EXISTS ops_issues_customer_state_idx ON issues(customer_id, state, severity);
      CREATE INDEX IF NOT EXISTS ops_comments_issue_idx ON comments(issue_id);
      CREATE INDEX IF NOT EXISTS ops_links_issue_idx ON links(issue_id);
    `);
  }

  #seed(): void {
    const count = get<{ count: number }>(
      this.connection.prepare("SELECT count(*) AS count FROM contracts"),
    )?.count;
    if (count && count > 0) return;

    const fixtures = createOpsFixtures();
    this.connection.exec("BEGIN IMMEDIATE");
    try {
      const employee = this.connection.prepare(
        "INSERT INTO employees (id, name, email) VALUES (?, ?, ?)",
      );
      for (const row of fixtures.employees) employee.run(row.id, row.name, row.email);

      const contract = this.connection.prepare(`
        INSERT INTO contracts
          (id, customer_id, title, status, effective_date, renewal_date, owner_id, archived_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.contracts) {
        contract.run(
          row.id,
          row.customerId,
          row.title,
          row.status,
          row.effectiveDate,
          row.renewalDate,
          row.ownerId,
          row.archivedAt,
        );
      }

      const attachment = this.connection.prepare(`
        INSERT INTO attachments
          (id, contract_id, filename, media_type, size_bytes, checksum, content)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.attachments) {
        attachment.run(
          row.id,
          row.contractId,
          row.filename,
          row.mediaType,
          row.content.byteLength,
          row.checksum,
          row.content,
        );
      }

      const issue = this.connection.prepare(`
        INSERT INTO issues
          (id, customer_id, title, severity, state, assignee_id, due_date, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.issues) {
        issue.run(
          row.id,
          row.customerId,
          row.title,
          row.severity,
          row.state,
          row.assigneeId,
          row.dueDate,
          row.deletedAt,
        );
      }

      const comment = this.connection.prepare(`
        INSERT INTO comments (id, issue_id, author_id, body, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const row of fixtures.comments)
        comment.run(row.id, row.issueId, row.authorId, row.body, row.createdAt);

      const link = this.connection.prepare(
        "INSERT INTO links (id, issue_id, label, url) VALUES (?, ?, ?, ?)",
      );
      for (const row of fixtures.links) link.run(row.id, row.issueId, row.label, row.url);
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
    return {
      employees: count("employees"),
      contracts: count("contracts"),
      attachments: count("attachments"),
      issues: count("issues"),
      comments: count("comments"),
      links: count("links"),
    };
  }

  contracts(): readonly SqlRecord[] {
    return all(
      this.connection.prepare(`
        SELECT c.*, e.name AS owner_name, e.email AS owner_email,
               a.id AS attachment_id, a.filename AS attachment_filename,
               a.media_type AS attachment_media_type, a.size_bytes AS attachment_size_bytes,
               a.checksum AS attachment_checksum
        FROM contracts c
        JOIN employees e ON e.id = c.owner_id
        JOIN attachments a ON a.contract_id = c.id
        ORDER BY c.id
      `),
    );
  }

  contract(id: string): SqlRecord | null {
    return get(
      this.connection.prepare(`
        SELECT c.*, e.name AS owner_name, e.email AS owner_email,
               a.id AS attachment_id, a.filename AS attachment_filename,
               a.media_type AS attachment_media_type, a.size_bytes AS attachment_size_bytes,
               a.checksum AS attachment_checksum
        FROM contracts c
        JOIN employees e ON e.id = c.owner_id
        JOIN attachments a ON a.contract_id = c.id
        WHERE c.id = ?
      `),
      id,
    );
  }

  issues(): readonly SqlRecord[] {
    return all(
      this.connection.prepare(`
        SELECT i.*, e.name AS assignee_name, e.email AS assignee_email
        FROM issues i JOIN employees e ON e.id = i.assignee_id
        ORDER BY i.id
      `),
    );
  }

  issue(id: string): SqlRecord | null {
    const issue = get(
      this.connection.prepare(`
        SELECT i.*, e.name AS assignee_name, e.email AS assignee_email
        FROM issues i JOIN employees e ON e.id = i.assignee_id
        WHERE i.id = ?
      `),
      id,
    );
    if (!issue) return null;
    return {
      ...issue,
      comments: all(
        this.connection.prepare(`
          SELECT c.*, e.name AS author_name
          FROM comments c JOIN employees e ON e.id = c.author_id
          WHERE c.issue_id = ? ORDER BY c.created_at, c.id
        `),
        id,
      ),
      links: all(this.connection.prepare("SELECT * FROM links WHERE issue_id = ? ORDER BY id"), id),
    };
  }

  attachment(id: string): Readonly<{
    filename: string;
    mediaType: string;
    checksum: string;
    content: Uint8Array;
  }> | null {
    const row = get<{
      filename: string;
      media_type: string;
      checksum: string;
      content: Uint8Array;
    }>(
      this.connection.prepare(
        "SELECT filename, media_type, checksum, content FROM attachments WHERE id = ?",
      ),
      id,
    );
    return row
      ? {
          filename: row.filename,
          mediaType: row.media_type,
          checksum: row.checksum,
          content: row.content,
        }
      : null;
  }

  appendComment(issueId: string, body: string): SqlRecord {
    if (!this.issue(issueId)) {
      throw new Error("Issue not found.");
    }
    const comment = {
      id: `comment_${randomUUID()}`,
      issue_id: issueId,
      author_id: "ops_emp_001",
      body,
      created_at: new Date().toISOString(),
    };
    this.connection
      .prepare(
        "INSERT INTO comments (id, issue_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(comment.id, comment.issue_id, comment.author_id, comment.body, comment.created_at);
    return comment;
  }

  close(): void {
    this.connection.close();
  }
}
