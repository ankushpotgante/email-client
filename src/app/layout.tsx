import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { EmailProvider } from "@/lib/store/store";
import PWARegister from "@/components/PWARegister";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuraMail | AI-First Universal Email Client",
  description: "Premium universal email client powered by Smart AI triage, summaries, and drafts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AuraMail",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-zinc-950 text-zinc-50 antialiased scroll-smooth">
      <body className={`${outfit.variable} ${inter.variable} font-sans min-h-full flex flex-col bg-zinc-950 text-zinc-50`}>
        <EmailProvider>
          <PWARegister />
          {children}
        </EmailProvider>
      </body>
    </html>
  );
}
