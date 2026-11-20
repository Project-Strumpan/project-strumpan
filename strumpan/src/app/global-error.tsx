'use client'
import RootLayout from "./layout"
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


 // Error boundaries must be Client Components

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    // global-error must include html and body tags
    <html
          lang="sv"
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
          <body className="min-h-full flex flex-col bg-background text-gray-900">
            <Navbar/>
            <Providers>
              <div className="flex-1">
                
                <div className='flex flex-col items-center'>
                    <h1 className="text-5xl mt-24">Something went wrong!</h1>
                    <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                    onClick={() => retry()}>
                        Try again
                    </button>
                </div>
              </div>
              <Footer/>
            </Providers>
          </body>
        </html>
  )
}