import type { Metadata, Viewport } from "next";
import { FrontendErrorLogger } from "@/components/frontend-error-logger";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Checktask Explorer",
    template: "%s | Checktask Explorer",
  },
  description: "Explorador visual de pastas, checkpoints e tarefas.",
  applicationName: "Checktask Explorer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Checktask Explorer",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <FrontendErrorLogger />
        <PwaRegister />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
