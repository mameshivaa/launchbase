import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchBase",
  description: "Launch OS for early-stage startups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AuthHeader />
        {children}
      </body>
    </html>
  );
}
