import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DemoProvider } from "@/lib/demo-store";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VS CRM",
  description: "VOspaces CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
