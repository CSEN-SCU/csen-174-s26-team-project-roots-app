import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "Roots — Context-Aware Personal Planner",
  description:
    "Roots transforms saved reels and TikToks into actionable, weather-checked, group-coordinated plans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-ink">{children}</body>
    </html>
  );
}
