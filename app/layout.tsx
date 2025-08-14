import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Kodiak Snow Removal - Contract Renewal",
  description: "Renew your snow removal contract for the 2025/2026 season",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#dbeafe" />
        <meta name="apple-mobile-web-app-status-bar-style" content="light-content" />
        <meta name="msapplication-navbutton-color" content="#dbeafe" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
