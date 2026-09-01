// SPDX-License-Identifier: MIT

import { OPS_FIXTURE_COUNTS } from "./fixtures.js";

export const OPS_SOURCE_CONTRACT = Object.freeze({
  source: "demo-ops",
  schemaVersion: 1,
  expectedCounts: OPS_FIXTURE_COUNTS,
  flagshipOracle: {
    customerId: "cust_001",
    currentContractId: "contract_001",
    unresolvedHighSeverityIssues: 3,
  },
  streams: {
    employees: { primaryKey: "id", cursor: null },
    contracts: { primaryKey: "id", cursor: null },
    attachments: { primaryKey: "id", contentEndpoint: "/api/attachments/:id/download" },
    issues: { primaryKey: "id", cursor: null },
    comments: { primaryKey: "id", cursor: "createdAt" },
    links: { primaryKey: "id", cursor: null },
  },
  exports: {
    contractsCsv: {
      path: "/api/export/contracts.csv",
      includedFields: ["id", "customer_id", "title", "status", "renewal_date"],
      omittedFields: ["attachment_id", "attachment_checksum", "owner_id"],
    },
  },
  outageModes: [
    "total",
    "auth_failure",
    "read_only",
    "delay",
    "corrupted_export",
    "missing_attachment",
    "schema_change",
  ],
});
