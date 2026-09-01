export type WorkerFoundationStatus = Readonly<{
  service: "ark-worker";
  status: "ready";
  phase: 1;
}>;

export function workerFoundationStatus(): WorkerFoundationStatus {
  return {
    service: "ark-worker",
    status: "ready",
    phase: 1,
  };
}
