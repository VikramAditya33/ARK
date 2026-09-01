// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  InvalidStateTransitionError,
  TransitionIdempotencyConflictError,
  createInitialState,
  transitionState,
  type StateMachineDefinition,
  type StateSnapshot,
} from "./machine.js";
import {
  buildStateMachine,
  captureStateMachine,
  drillStateMachine,
  incidentStateMachine,
  reconciliationStateMachine,
  solariResourceStateMachine,
} from "./workflows.js";

const machines = [
  captureStateMachine,
  buildStateMachine,
  drillStateMachine,
  incidentStateMachine,
  reconciliationStateMachine,
  solariResourceStateMachine,
] as const;

function reachEveryState(
  machine: StateMachineDefinition<string>,
): ReadonlyMap<string, StateSnapshot<string>> {
  const snapshots = new Map<string, StateSnapshot<string>>();
  const initial = createInitialState(machine);
  snapshots.set(initial.state, initial);
  const queue = [initial];

  while (queue.length > 0) {
    const snapshot = queue.shift()!;
    for (const target of machine.transitions[snapshot.state] ?? []) {
      if (snapshots.has(target)) {
        continue;
      }
      const next = transitionState(machine, snapshot, target, `reach:${snapshot.state}:${target}`);
      snapshots.set(target, next);
      queue.push(next);
    }
  }

  return snapshots;
}

describe("workflow state machines", () => {
  for (const typedMachine of machines) {
    const machine = typedMachine as StateMachineDefinition<string>;

    describe(machine.name, () => {
      it("makes every declared state reachable and every declared edge valid", () => {
        const snapshots = reachEveryState(machine);
        expect([...snapshots.keys()].sort()).toEqual([...machine.states].sort());

        for (const from of machine.states) {
          for (const to of machine.transitions[from] ?? []) {
            const result = transitionState(
              machine,
              snapshots.get(from)!,
              to,
              `valid:${from}:${to}`,
            );
            expect(result.state).toBe(to);
            expect(result.revision).toBe(snapshots.get(from)!.revision + 1);
          }
        }
      });

      it("rejects every undeclared state edge", () => {
        const snapshots = reachEveryState(machine);

        for (const from of machine.states) {
          const allowed = machine.transitions[from] ?? [];
          for (const to of machine.states) {
            if (allowed.includes(to)) {
              continue;
            }
            expect(() =>
              transitionState(machine, snapshots.get(from)!, to, `invalid:${from}:${to}`),
            ).toThrow(InvalidStateTransitionError);
          }
        }
      });
    });
  }

  it("returns the unchanged snapshot for an idempotent retry", () => {
    const initial = createInitialState(captureStateMachine);
    const first = transitionState(captureStateMachine, initial, "provisioning", "capture:start");
    const retry = transitionState(captureStateMachine, first, "provisioning", "capture:start");

    expect(retry).toBe(first);
  });

  it("rejects reuse of an idempotency key for a different transition", () => {
    const initial = createInitialState(drillStateMachine);
    const provisioning = transitionState(drillStateMachine, initial, "provisioning", "drill:1");

    expect(() => transitionState(drillStateMachine, provisioning, "injecting", "drill:1")).toThrow(
      TransitionIdempotencyConflictError,
    );
  });

  it("rejects blank or excessively long idempotency keys", () => {
    const initial = createInitialState(buildStateMachine);
    expect(() => transitionState(buildStateMachine, initial, "assembling", "")).toThrow(TypeError);
    expect(() =>
      transitionState(buildStateMachine, initial, "assembling", "x".repeat(256)),
    ).toThrow(TypeError);
  });
});
