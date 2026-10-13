import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAssist CRM | Field Sales & Distribution Management System",
  description: "Enterprise SFA, DMS, and Secondary Sales Automation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-100">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased text-slate-800`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
