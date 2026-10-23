import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SonarDocs - Exam Digitizer",
    short_name: "SonarDocs",
    description: "Instant exam paper to Word document converter for teachers.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F5FB",
    theme_color: "#2E1F4D",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
