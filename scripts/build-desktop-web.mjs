import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const nextCliPath = path.resolve(scriptDir, "../node_modules/next/dist/bin/next");

const child = spawn(process.execPath, [nextCliPath, "build"], {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    CHECKTASK_DESKTOP: "1",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
