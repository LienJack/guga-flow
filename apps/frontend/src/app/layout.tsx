import type { Metadata } from "next";

import "tldraw/tldraw.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "guga-flow",
  description: "Canvas-first novel-to-video production workspace",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
