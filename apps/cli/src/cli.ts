export type CliIo = Readonly<{
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}>;

export function runCli(args: readonly string[], io: CliIo): number {
  const command = args[0] ?? "help";

  if (command === "--version" || command === "version") {
    io.stdout("ark 0.0.0");
    return 0;
  }

  if (command === "doctor") {
    io.stdout(JSON.stringify({ service: "ark-cli", status: "ready", phase: 1 }));
    return 0;
  }

  if (command === "help" || command === "--help") {
    io.stdout("Usage: ark <doctor|version>");
    return 0;
  }

  io.stderr(`Unknown command: ${command}`);
  return 1;
}
