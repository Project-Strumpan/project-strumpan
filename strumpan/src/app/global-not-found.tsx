// Import global styles and fonts
import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import RootLayout from './layout'


export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}

export default function GlobalNotFound() {
  return (
    <RootLayout>
        <div className='flex flex-col items-center'>
            <h1 className="text-5xl mt-24">404 - Page Not Found</h1>
            <p className="text-2xl mt-5">This page does not exist.</p>
        </div>
    </RootLayout>
  )
}