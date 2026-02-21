import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const appTitle = process.env.NEXT_PUBLIC_APP_VERSION
  ? `Outbound Growth Engine · ${process.env.NEXT_PUBLIC_APP_VERSION}`
  : "Outbound Growth Engine";

export const metadata: Metadata = {
  title: appTitle,
  description: "Automated outbound engine that does what SDRs do.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
