import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Checktask Explorer",
    short_name: "Checktask",
    description:
      "Organizador visual local de pastas, subpastas e tarefas com checkpoints claros.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#111827",
    lang: "pt-BR",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/checktask-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/checktask-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
