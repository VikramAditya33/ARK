// SPDX-License-Identifier: MIT

import { pgEnum } from "drizzle-orm/pg-core";

export const dataClassificationEnum = pgEnum("data_classification", [
  "public",
  "internal",
  "confidential",
  "restricted",
  "credential",
]);

export const captureMethodEnum = pgEnum("capture_method", [
  "api",
  "export",
  "network",
  "browser",
  "desktop",
  "manual",
]);

export const captureStateEnum = pgEnum("capture_state", [
  "queued",
  "provisioning",
  "capturing",
  "validating",
  "normalizing",
  "publishing",
  "succeeded",
]);

export const buildStateEnum = pgEnum("build_state", [
  "queued",
  "assembling",
  "validating",
  "snapshotting",
  "ready",
]);

export const drillStateEnum = pgEnum("drill_state", [
  "queued",
  "provisioning",
  "injecting",
  "executing",
  "verifying",
  "reporting",
  "passed",
  "failed",
]);

export const incidentStateEnum = pgEnum("incident_state", [
  "declared",
  "assessing",
  "awaiting_approval",
  "activating",
  "active",
  "reconciling",
  "resolved",
]);

export const reconciliationStateEnum = pgEnum("reconciliation_state", [
  "proposed",
  "awaiting_approval",
  "executing",
  "applied",
  "conflicted",
  "failed",
]);

export const solariResourceStateEnum = pgEnum("solari_resource_state", [
  "requested",
  "created",
  "connected",
  "releasing",
  "released",
  "cleanup_failed",
]);

export const approvalStateEnum = pgEnum("approval_state", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);
