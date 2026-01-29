import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { APP_CONFIG } from "@/config/constants"

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: APP_CONFIG.name,
    description: APP_CONFIG.description,
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased`}>
                {children}
            </body>
        </html>
    )
}
