"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, LaptopMinimalCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallAppButton() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneMode());

  useEffect(() => {
    const isHttpContext =
      window.location.protocol === "http:" ||
      window.location.protocol === "https:";

    if (!isHttpContext) {
      return;
    }

    const media = window.matchMedia("(display-mode: standalone)");

    function handlePrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    function handleModeChange(event: MediaQueryListEvent) {
      setInstalled(event.matches);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handlePrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleInstalled);
    media.addEventListener("change", handleModeChange);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handlePrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleInstalled);
      media.removeEventListener("change", handleModeChange);
    };
  }, []);

  const buttonLabel = useMemo(
    () => (installed ? "App instalada" : "Instalar app"),
    [installed],
  );

  const isHttpContext =
    typeof window !== "undefined" &&
    (window.location.protocol === "http:" ||
      window.location.protocol === "https:");

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;

    if (outcome === "accepted") {
      setInstallEvent(null);
    }
  }

  if (!isHttpContext || (!installEvent && !installed)) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleInstall()}
      disabled={installed}
    >
      {installed ? <LaptopMinimalCheck /> : <Download />}
      {buttonLabel}
    </Button>
  );
}
