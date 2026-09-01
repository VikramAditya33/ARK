// SPDX-License-Identifier: MIT

import { CRM_DEMO_PERIOD, CRM_FIXTURE_COUNTS } from "./fixtures.js";

export const CRM_SOURCE_CONTRACT = Object.freeze({
  source: "demo-crm",
  schemaVersion: 1,
  expectedCounts: CRM_FIXTURE_COUNTS,
  demoPeriod: CRM_DEMO_PERIOD,
  flagshipOracle: {
    customerId: "cust_001",
    renewalDealId: "deal_001",
    accountOwnerEmail: "maya.patel@example.test",
    preExistingRenewalTasks: 0,
  },
  streams: {
    organizations: { primaryKey: "id", cursor: null },
    employees: { primaryKey: "id", cursor: null },
    customers: { primaryKey: "id", cursor: null },
    contacts: { primaryKey: "id", cursor: null },
    deals: { primaryKey: "id", cursor: null },
    auditEvents: { primaryKey: "id", cursor: "occurredAt" },
  },
  exports: {
    customersCsv: {
      path: "/api/export/customers.csv",
      includedFields: [
        "id",
        "name",
        "status",
        "domain",
        "renewal_date",
        "annual_value",
        "currency",
      ],
      omittedFields: ["account_owner_id", "account_owner_email", "custom_fields"],
    },
  },
  outageModes: ["total", "auth_failure", "read_only", "delay", "corrupted_export", "schema_change"],
});
