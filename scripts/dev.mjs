// Accept both Next's CLI flags and the host/port flags used by workspace previews.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const args = process.argv
  .slice(2)
  .filter((arg) => arg !== "--strictPort")
  .map((arg) => (arg === "--host" ? "--hostname" : arg));
const server = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", "--webpack", ...args],
  { stdio: "inherit" },
);
for (const event of ["SIGTERM", "SIGINT"])
  process.on(event, () => server.kill(event));
server.on("exit", (code) => process.exit(code ?? 1));
