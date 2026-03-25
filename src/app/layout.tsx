import type { Metadata } from "next";

import { SiteShell } from "@/components/site-shell";
import { getCurrentUser } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: "Golf for Good",
  description: "A charity-first golf subscription platform with score tracking and monthly draw rewards.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <SiteShell user={user}>{children}</SiteShell>
      </body>
    </html>
  );
}
