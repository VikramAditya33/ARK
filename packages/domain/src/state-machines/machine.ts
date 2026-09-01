// SPDX-License-Identifier: MIT

export type AppliedTransition<State extends string> = Readonly<{
  from: State;
  to: State;
  idempotencyKey: string;
}>;

export type StateSnapshot<State extends string> = Readonly<{
  machine: string;
  state: State;
  revision: number;
  appliedTransitions: readonly AppliedTransition<State>[];
}>;

export type StateMachineDefinition<State extends string> = Readonly<{
  name: string;
  initialState: State;
  states: readonly State[];
  transitions: Readonly<Record<State, readonly State[]>>;
}>;

export class InvalidStateTransitionError extends Error {
  readonly machine: string;
  readonly from: string;
  readonly to: string;

  constructor(machine: string, from: string, to: string) {
    super(`Invalid ${machine} transition: ${from} -> ${to}.`);
    this.name = "InvalidStateTransitionError";
    this.machine = machine;
    this.from = from;
    this.to = to;
  }
}

export class TransitionIdempotencyConflictError extends Error {
  readonly idempotencyKey: string;

  constructor(idempotencyKey: string) {
    super("The transition idempotency key was already used for a different target state.");
    this.name = "TransitionIdempotencyConflictError";
    this.idempotencyKey = idempotencyKey;
  }
}

export function createInitialState<State extends string>(
  definition: StateMachineDefinition<State>,
): StateSnapshot<State> {
  return Object.freeze({
    machine: definition.name,
    state: definition.initialState,
    revision: 0,
    appliedTransitions: Object.freeze([]),
  });
}

export function transitionState<State extends string>(
  definition: StateMachineDefinition<State>,
  snapshot: StateSnapshot<State>,
  to: State,
  idempotencyKey: string,
): StateSnapshot<State> {
  if (snapshot.machine !== definition.name || !definition.states.includes(snapshot.state)) {
    throw new InvalidStateTransitionError(definition.name, snapshot.state, to);
  }
  if (idempotencyKey.trim().length === 0 || idempotencyKey.length > 255) {
    throw new TypeError("A transition idempotency key must contain 1-255 characters.");
  }

  const existing = snapshot.appliedTransitions.find(
    (transition) => transition.idempotencyKey === idempotencyKey,
  );
  if (existing) {
    if (existing.to !== to) {
      throw new TransitionIdempotencyConflictError(idempotencyKey);
    }
    return snapshot;
  }

  if (!definition.transitions[snapshot.state].includes(to)) {
    throw new InvalidStateTransitionError(definition.name, snapshot.state, to);
  }

  const transition = Object.freeze({ from: snapshot.state, to, idempotencyKey });
  return Object.freeze({
    machine: definition.name,
    state: to,
    revision: snapshot.revision + 1,
    appliedTransitions: Object.freeze([...snapshot.appliedTransitions, transition]),
  });
}
