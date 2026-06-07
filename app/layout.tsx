import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVA — The Sealed Oracle",
  description:
    "A World Cup forecaster who seals every prediction on-chain and gets sharper because she remembers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
