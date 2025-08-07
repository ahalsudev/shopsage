import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'ShopSage - Real-Time Shopping Consultation',
  description: 'Connect with shopping experts through 5-minute video calls. Make confident purchases and eliminate buyer\'s remorse with personalized advice.',
  keywords: 'shopping consultation, expert advice, video calls, Solana, mobile shopping, personalized shopping',
  openGraph: {
    title: 'ShopSage - Real-Time Shopping Consultation',
    description: 'Stop shopping alone. Get expert advice through 5-minute video calls.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
