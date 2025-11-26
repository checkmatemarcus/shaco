import "./globals.css";
import type { Metadata } from "next";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Shaco",
  description: "Shaco – del 1–4 ukers prosjekter med andre.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <TopNav />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
