import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strumpan - Webbutik",
  description: "Kvalitetsstrumpor online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sv"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Navbar/>
        <Providers>
          <div className="flex-1">{children}</div>
          <footer className="flex justify-center gap-4 border-t border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            <Link href="/about" className="hover:underline">
              Om oss
            </Link>
            <Link href="/cookies" className="hover:underline">
              Cookies
            </Link>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
