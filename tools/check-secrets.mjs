#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const patterns = [
  ["Solari API key", /\bslr_live_[A-Za-z0-9_-]{12,}\b/],
  ["OpenAI API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,})\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];

const candidates = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: repositoryRoot, encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const failures = [];

for (const relativePath of candidates) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    continue;
  }

  const bytes = readFileSync(absolutePath);
  if (bytes.includes(0)) {
    continue;
  }

  const text = bytes.toString("utf8");
  for (const [name, pattern] of patterns) {
    if (pattern.test(text)) {
      failures.push(`${relativePath}: possible ${name}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Potential secrets found:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Secret scan passed (${candidates.length} public candidate files).`);
