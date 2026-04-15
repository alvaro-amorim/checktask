import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2];
const isWindows = process.platform === "win32";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cargoBinDir = isWindows
  ? path.join(process.env.USERPROFILE ?? "", ".cargo", "bin")
  : path.join(process.env.HOME ?? "", ".cargo", "bin");
const desktopBuildScript = path.resolve(scriptDir, "build-desktop-web.mjs");
const tauriCliScript = path.resolve(
  scriptDir,
  "../node_modules/@tauri-apps/cli/tauri.js",
);

if (mode !== "dev" && mode !== "build") {
  console.error("Use `node scripts/run-tauri.mjs dev` ou `build`.");
  process.exit(1);
}

function resolveCommand(command) {
  const candidates = [command];

  if (cargoBinDir) {
    candidates.push(
      path.join(cargoBinDir, isWindows ? `${command}.exe` : command),
    );
  }

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-V"], {
      stdio: "ignore",
      shell: false,
    });

    if (result.status === 0) {
      return candidate;
    }
  }

  return null;
}

const rustcCommand = resolveCommand("rustc");
const cargoCommand = resolveCommand("cargo");
const bundleOnlyConfig = "src-tauri/tauri.bundle-only.conf.json";

if (!rustcCommand || !cargoCommand) {
  console.error(
    [
      "Rust nao foi encontrado.",
      "Instale o Rust toolchain para empacotar o app desktop.",
      "No Windows, o caminho mais simples eh usar: winget install Rustlang.Rustup",
      "Depois rode novamente `npm run desktop:build`.",
    ].join("\n"),
  );
  process.exit(1);
}

const env = { ...process.env };

if (existsSync(cargoBinDir)) {
  env.PATH = `${cargoBinDir}${path.delimiter}${env.PATH ?? ""}`;
}

function runCommand(command, args = [], extraEnv = env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env: extraEnv,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code ?? 1}.`));
    });
  });
}

const tauriArgs = [tauriCliScript, mode];

if (mode === "build") {
  await runCommand(process.execPath, [desktopBuildScript], process.env);
  tauriArgs.push("--config", bundleOnlyConfig);
}

await runCommand(process.execPath, tauriArgs);
