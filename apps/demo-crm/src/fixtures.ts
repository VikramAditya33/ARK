// SPDX-License-Identifier: MIT

export const CRM_FIXTURE_COUNTS = Object.freeze({
  organizations: 1,
  employees: 10,
  customers: 50,
  contacts: 75,
  deals: 80,
  demoPeriodRenewals: 12,
  auditEvents: 6,
});

export const FLAGSHIP_CUSTOMER_ID = "cust_001";
export const FLAGSHIP_CUSTOMER_NAME = "Acme Manufacturing";
export const FLAGSHIP_DEAL_ID = "deal_001";
export const CRM_DEMO_PERIOD = Object.freeze({ from: "2026-09-01", to: "2026-09-30" });

const pad = (value: number): string => value.toString().padStart(3, "0");
const day = (value: number): string => value.toString().padStart(2, "0");

export type CrmFixtures = Readonly<{
  organizations: readonly Readonly<{ id: string; name: string }>[];
  employees: readonly Readonly<{ id: string; name: string; email: string; role: string }>[];
  customers: readonly Readonly<{
    id: string;
    name: string;
    domain: string;
    status: string;
    accountOwnerId: string;
    customFields: string;
    archivedAt: string | null;
    deletedAt: string | null;
  }>[];
  contacts: readonly Readonly<{
    id: string;
    customerId: string;
    name: string;
    email: string;
    phone: string | null;
    role: string | null;
  }>[];
  deals: readonly Readonly<{
    id: string;
    customerId: string;
    name: string;
    stage: string;
    renewalDate: string;
    annualValue: number;
    currency: string;
    customFields: string;
    deletedAt: string | null;
  }>[];
  auditEvents: readonly Readonly<{
    id: string;
    actor: string;
    action: string;
    recordType: string;
    recordId: string;
    occurredAt: string;
  }>[];
}>;

export function createCrmFixtures(): CrmFixtures {
  const employees = Array.from({ length: CRM_FIXTURE_COUNTS.employees }, (_, index) => {
    const number = index + 1;
    return {
      id: `emp_${pad(number)}`,
      name: number === 1 ? "Maya Patel" : `Account Owner ${number}`,
      email: number === 1 ? "maya.patel@example.test" : `owner${number}@example.test`,
      role: number <= 7 ? "account_owner" : "revenue_operations",
    };
  });

  const customers = Array.from({ length: CRM_FIXTURE_COUNTS.customers }, (_, index) => {
    const number = index + 1;
    const normalName = `Demo Customer ${pad(number)}`;
    const name =
      number === 1
        ? FLAGSHIP_CUSTOMER_NAME
        : number === 20 || number === 21
          ? "Northstar Labs"
          : number === 49
            ? "München Präzision GmbH"
            : normalName;
    return {
      id: `cust_${pad(number)}`,
      name,
      domain: number === 1 ? "acme-manufacturing.example" : `customer-${number}.example`,
      status: number === 50 ? "archived" : number === 48 ? "deleted" : "active",
      accountOwnerId: `emp_${pad(((number - 1) % 10) + 1)}`,
      customFields: JSON.stringify({
        renewalRisk: number === 1 ? "high" : number % 4 === 0 ? "medium" : "low",
        supportTier: number === 1 ? "enterprise" : number % 3 === 0 ? "premium" : "standard",
      }),
      archivedAt: number === 50 ? "2026-08-01T00:00:00.000Z" : null,
      deletedAt: number === 48 ? "2026-08-15T00:00:00.000Z" : null,
    };
  });

  const contacts = Array.from({ length: CRM_FIXTURE_COUNTS.contacts }, (_, index) => {
    const number = index + 1;
    const customerNumber = number <= 50 ? number : number - 50;
    return {
      id: `contact_${pad(number)}`,
      customerId: `cust_${pad(customerNumber)}`,
      name: number === 1 ? "Jordan Lee" : `Contact ${pad(number)}`,
      email:
        number === 1 ? "jordan.lee@acme-manufacturing.example" : `contact${number}@example.test`,
      phone: number === 75 ? null : `+1-555-${number.toString().padStart(4, "0")}`,
      role: number === 1 ? "VP Operations" : number % 9 === 0 ? null : "Business Contact",
    };
  });

  const deals = Array.from({ length: CRM_FIXTURE_COUNTS.deals }, (_, index) => {
    const number = index + 1;
    const customerNumber = ((number - 1) % 50) + 1;
    const renewal = number <= CRM_FIXTURE_COUNTS.demoPeriodRenewals;
    return {
      id: `deal_${pad(number)}`,
      customerId: `cust_${pad(customerNumber)}`,
      name: number === 1 ? "Acme 2026 Renewal" : `Commercial Agreement ${pad(number)}`,
      stage: renewal ? "renewal_due" : number % 7 === 0 ? "closed_won" : "active",
      renewalDate: renewal ? `2026-09-${day(number + 1)}` : `2027-${day((number % 12) + 1)}-15`,
      annualValue: number === 1 ? 240_000 : 25_000 + number * 1_250,
      currency: number % 11 === 0 ? "EUR" : "USD",
      customFields: JSON.stringify({ autoRenew: number % 2 === 0, procurementStatus: "approved" }),
      deletedAt: number === 80 ? "2026-08-20T00:00:00.000Z" : null,
    };
  });

  const auditEvents = [
    ["audit_001", "maya.patel@example.test", "viewed", "customer", "cust_001"],
    ["audit_002", "maya.patel@example.test", "updated", "deal", "deal_001"],
    ["audit_003", "revenue-ops@example.test", "exported", "customer", "all"],
    ["audit_004", "owner2@example.test", "viewed", "customer", "cust_002"],
    ["audit_005", "owner3@example.test", "updated", "contact", "contact_003"],
    ["audit_006", "system", "archived", "customer", "cust_050"],
  ].map(([id, actor, action, recordType, recordId], index) => ({
    id: id!,
    actor: actor!,
    action: action!,
    recordType: recordType!,
    recordId: recordId!,
    occurredAt: `2026-09-01T08:${(index + 10).toString().padStart(2, "0")}:00.000Z`,
  }));

  return {
    organizations: [{ id: "org_demo", name: "Pinecone Systems" }],
    employees,
    customers,
    contacts,
    deals,
    auditEvents,
  };
}
