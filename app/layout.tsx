import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Pranata - Personal Life Operating System",
  description: "Nata Urip • Tentreming Ati. Manage schedules, departures, todos, notes, resources, and finances in a lightweight, mobile-first app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased font-sans`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        {children}
        <Toaster position="top-center" closeButton richColors />
      </body>
    </html>
  );
}
