"use client";

import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function nowStamp() {
  return new Date().toISOString();
}

function normalizeError(value: unknown) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ""}`;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function writeFrontendErrorLog(message: string) {
  try {
    await invoke("log_frontend_error", { payload: message });
  } catch {
    // Avoid recursive logging loops.
  }
}

export function FrontendErrorLogger() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const text = [
        `[${nowStamp()}] window.error`,
        `message: ${event.message}`,
        `source: ${event.filename}:${event.lineno}:${event.colno}`,
        normalizeError(event.error),
        "---",
      ].join("\n");

      void writeFrontendErrorLog(text);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const text = [
        `[${nowStamp()}] window.unhandledrejection`,
        normalizeError(event.reason),
        "---",
      ].join("\n");

      void writeFrontendErrorLog(text);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
