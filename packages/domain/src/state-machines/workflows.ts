// SPDX-License-Identifier: MIT

import {
  createInitialState,
  transitionState,
  type StateMachineDefinition,
  type StateSnapshot,
} from "./machine.js";

export const CAPTURE_STATES = [
  "queued",
  "provisioning",
  "capturing",
  "validating",
  "normalizing",
  "publishing",
  "succeeded",
] as const;
export type CaptureState = (typeof CAPTURE_STATES)[number];
export const captureStateMachine = {
  name: "capture",
  initialState: "queued",
  states: CAPTURE_STATES,
  transitions: {
    queued: ["provisioning"],
    provisioning: ["capturing"],
    capturing: ["validating"],
    validating: ["normalizing"],
    normalizing: ["publishing"],
    publishing: ["succeeded"],
    succeeded: [],
  },
} as const satisfies StateMachineDefinition<CaptureState>;

export const BUILD_STATES = [
  "queued",
  "assembling",
  "validating",
  "snapshotting",
  "ready",
] as const;
export type BuildState = (typeof BUILD_STATES)[number];
export const buildStateMachine = {
  name: "build",
  initialState: "queued",
  states: BUILD_STATES,
  transitions: {
    queued: ["assembling"],
    assembling: ["validating"],
    validating: ["snapshotting"],
    snapshotting: ["ready"],
    ready: [],
  },
} as const satisfies StateMachineDefinition<BuildState>;

export const DRILL_STATES = [
  "queued",
  "provisioning",
  "injecting",
  "executing",
  "verifying",
  "reporting",
  "passed",
  "failed",
] as const;
export type DrillState = (typeof DRILL_STATES)[number];
export const drillStateMachine = {
  name: "drill",
  initialState: "queued",
  states: DRILL_STATES,
  transitions: {
    queued: ["provisioning"],
    provisioning: ["injecting"],
    injecting: ["executing"],
    executing: ["verifying"],
    verifying: ["reporting"],
    reporting: ["passed", "failed"],
    passed: [],
    failed: [],
  },
} as const satisfies StateMachineDefinition<DrillState>;

export const INCIDENT_STATES = [
  "declared",
  "assessing",
  "awaiting_approval",
  "activating",
  "active",
  "reconciling",
  "resolved",
] as const;
export type IncidentState = (typeof INCIDENT_STATES)[number];
export const incidentStateMachine = {
  name: "incident",
  initialState: "declared",
  states: INCIDENT_STATES,
  transitions: {
    declared: ["assessing"],
    assessing: ["awaiting_approval"],
    awaiting_approval: ["activating"],
    activating: ["active"],
    active: ["reconciling"],
    reconciling: ["resolved"],
    resolved: [],
  },
} as const satisfies StateMachineDefinition<IncidentState>;

export const RECONCILIATION_STATES = [
  "proposed",
  "awaiting_approval",
  "executing",
  "applied",
  "conflicted",
  "failed",
] as const;
export type ReconciliationState = (typeof RECONCILIATION_STATES)[number];
export const reconciliationStateMachine = {
  name: "reconciliation",
  initialState: "proposed",
  states: RECONCILIATION_STATES,
  transitions: {
    proposed: ["awaiting_approval"],
    awaiting_approval: ["executing"],
    executing: ["applied", "conflicted", "failed"],
    applied: [],
    conflicted: [],
    failed: [],
  },
} as const satisfies StateMachineDefinition<ReconciliationState>;

export const SOLARI_RESOURCE_STATES = [
  "requested",
  "created",
  "connected",
  "releasing",
  "released",
  "cleanup_failed",
] as const;
export type SolariResourceState = (typeof SOLARI_RESOURCE_STATES)[number];
export const solariResourceStateMachine = {
  name: "solari-resource",
  initialState: "requested",
  states: SOLARI_RESOURCE_STATES,
  transitions: {
    requested: ["created"],
    created: ["connected", "releasing"],
    connected: ["releasing"],
    releasing: ["released", "cleanup_failed"],
    released: [],
    cleanup_failed: ["releasing"],
  },
} as const satisfies StateMachineDefinition<SolariResourceState>;

export const createCaptureState = (): StateSnapshot<CaptureState> =>
  createInitialState(captureStateMachine);
export const transitionCapture = (
  snapshot: StateSnapshot<CaptureState>,
  to: CaptureState,
  idempotencyKey: string,
): StateSnapshot<CaptureState> =>
  transitionState(captureStateMachine, snapshot, to, idempotencyKey);

export const createBuildState = (): StateSnapshot<BuildState> =>
  createInitialState(buildStateMachine);
export const transitionBuild = (
  snapshot: StateSnapshot<BuildState>,
  to: BuildState,
  idempotencyKey: string,
): StateSnapshot<BuildState> => transitionState(buildStateMachine, snapshot, to, idempotencyKey);

export const createDrillState = (): StateSnapshot<DrillState> =>
  createInitialState(drillStateMachine);
export const transitionDrill = (
  snapshot: StateSnapshot<DrillState>,
  to: DrillState,
  idempotencyKey: string,
): StateSnapshot<DrillState> => transitionState(drillStateMachine, snapshot, to, idempotencyKey);

export const createIncidentState = (): StateSnapshot<IncidentState> =>
  createInitialState(incidentStateMachine);
export const transitionIncident = (
  snapshot: StateSnapshot<IncidentState>,
  to: IncidentState,
  idempotencyKey: string,
): StateSnapshot<IncidentState> =>
  transitionState(incidentStateMachine, snapshot, to, idempotencyKey);

export const createReconciliationState = (): StateSnapshot<ReconciliationState> =>
  createInitialState(reconciliationStateMachine);
export const transitionReconciliation = (
  snapshot: StateSnapshot<ReconciliationState>,
  to: ReconciliationState,
  idempotencyKey: string,
): StateSnapshot<ReconciliationState> =>
  transitionState(reconciliationStateMachine, snapshot, to, idempotencyKey);

export const createSolariResourceState = (): StateSnapshot<SolariResourceState> =>
  createInitialState(solariResourceStateMachine);
export const transitionSolariResource = (
  snapshot: StateSnapshot<SolariResourceState>,
  to: SolariResourceState,
  idempotencyKey: string,
): StateSnapshot<SolariResourceState> =>
  transitionState(solariResourceStateMachine, snapshot, to, idempotencyKey);
