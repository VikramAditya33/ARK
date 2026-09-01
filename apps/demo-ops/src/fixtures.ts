// SPDX-License-Identifier: MIT

import { createHash } from "node:crypto";

export const OPS_FIXTURE_COUNTS = Object.freeze({
  employees: 12,
  contracts: 50,
  attachments: 50,
  issues: 200,
  comments: 200,
  links: 200,
});

export const OPS_FLAGSHIP_CUSTOMER_ID = "cust_001";
export const FLAGSHIP_CONTRACT_ID = "contract_001";
export const FLAGSHIP_ATTACHMENT_ID = "attachment_001";
export const LARGE_ATTACHMENT_ID = "attachment_050";

const pad = (value: number): string => value.toString().padStart(3, "0");

export type OpsFixtures = Readonly<{
  employees: readonly Readonly<{ id: string; name: string; email: string }>[];
  contracts: readonly Readonly<{
    id: string;
    customerId: string;
    title: string;
    status: string;
    effectiveDate: string;
    renewalDate: string;
    ownerId: string;
    archivedAt: string | null;
  }>[];
  attachments: readonly Readonly<{
    id: string;
    contractId: string;
    filename: string;
    mediaType: string;
    content: Uint8Array;
    checksum: string;
  }>[];
  issues: readonly Readonly<{
    id: string;
    customerId: string;
    title: string;
    severity: string;
    state: string;
    assigneeId: string;
    dueDate: string | null;
    deletedAt: string | null;
  }>[];
  comments: readonly Readonly<{
    id: string;
    issueId: string;
    authorId: string;
    body: string;
    createdAt: string;
  }>[];
  links: readonly Readonly<{ id: string; issueId: string; label: string; url: string }>[];
}>;

export function sha256(content: Uint8Array): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

export function createOpsFixtures(): OpsFixtures {
  const employees = Array.from({ length: OPS_FIXTURE_COUNTS.employees }, (_, index) => {
    const number = index + 1;
    return {
      id: `ops_emp_${pad(number)}`,
      name: number === 1 ? "Priya Shah" : `Delivery Owner ${number}`,
      email: number === 1 ? "priya.shah@example.test" : `delivery${number}@example.test`,
    };
  });

  const contracts = Array.from({ length: OPS_FIXTURE_COUNTS.contracts }, (_, index) => {
    const number = index + 1;
    return {
      id: `contract_${pad(number)}`,
      customerId: `cust_${pad(number)}`,
      title:
        number === 1
          ? "Acme Master Services Agreement"
          : number === 49
            ? "Rahmenvertrag — München Präzision"
            : `Customer ${pad(number)} Services Agreement`,
      status: number === 50 ? "archived" : "current",
      effectiveDate: `2025-${String(((number - 1) % 12) + 1).padStart(2, "0")}-01`,
      renewalDate:
        number === 1 ? "2026-09-02" : `2027-${String((number % 12) + 1).padStart(2, "0")}-15`,
      ownerId: `ops_emp_${pad(((number - 1) % 12) + 1)}`,
      archivedAt: number === 50 ? "2026-08-10T00:00:00.000Z" : null,
    };
  });

  const attachments = contracts.map((contract, index) => {
    const number = index + 1;
    const content =
      number === 50
        ? new Uint8Array(2 * 1024 * 1024).fill(65)
        : new TextEncoder().encode(
            number === 1
              ? "ACME MASTER SERVICES AGREEMENT\nRenewal: 2026-09-02\nGoverning law: California\n"
              : `${contract.title}\nContract ID: ${contract.id}\n`,
          );
    return {
      id: `attachment_${pad(number)}`,
      contractId: contract.id,
      filename: number === 1 ? "acme-master-services-agreement.txt" : `contract-${pad(number)}.txt`,
      mediaType: "text/plain",
      content,
      checksum: sha256(content),
    };
  });

  const issues = Array.from({ length: OPS_FIXTURE_COUNTS.issues }, (_, index) => {
    const number = index + 1;
    const flagship = number <= 3;
    const customerNumber = flagship ? 1 : ((number - 4) % 49) + 2;
    return {
      id: `issue_${pad(number)}`,
      customerId: `cust_${pad(customerNumber)}`,
      title: flagship
        ? ["Production rollout blocked", "Invoice reconciliation mismatch", "Open security review"][
            number - 1
          ]!
        : `Delivery issue ${pad(number)}`,
      severity: flagship
        ? "high"
        : number % 10 === 0
          ? "high"
          : number % 3 === 0
            ? "medium"
            : "low",
      state: flagship ? "open" : number % 5 === 0 ? "resolved" : "open",
      assigneeId: `ops_emp_${pad(((number - 1) % 12) + 1)}`,
      dueDate: number === 199 ? null : `2026-10-${String((number % 27) + 1).padStart(2, "0")}`,
      deletedAt: number === 200 ? "2026-08-22T00:00:00.000Z" : null,
    };
  });

  const comments = issues.map((issue, index) => ({
    id: `comment_${pad(index + 1)}`,
    issueId: issue.id,
    authorId: `ops_emp_${pad((index % 12) + 1)}`,
    body:
      index === 0
        ? "Customer escalation is active; renewal owner notified."
        : `Update for ${issue.id}`,
    createdAt: `2026-09-01T09:${String(index % 60).padStart(2, "0")}:00.000Z`,
  }));

  const links = issues.map((issue, index) => ({
    id: `link_${pad(index + 1)}`,
    issueId: issue.id,
    label: index === 0 ? "Incident runbook" : "Related delivery record",
    url: `https://ops.example.test/issues/${issue.id}/context`,
  }));

  return { employees, contracts, attachments, issues, comments, links };
}
