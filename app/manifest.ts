import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FieldLog — BACB Fieldwork Tracker",
    short_name: "FieldLog",
    description: "Track BACB fieldwork hours, compliance ratios, and supervisor approvals.",
    start_url: "/login",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F6FF",
    theme_color: "#7C3AED",
    categories: ["productivity", "medical"],
    icons: [
      { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png", purpose: "any" },
      { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png", purpose: "any" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
