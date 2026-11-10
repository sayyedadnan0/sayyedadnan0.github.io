import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { siteUrl, siteIndexable } from "@/server/seo";
import "@/styles/globals.css";
import "@/styles/portfolio-pages.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import CustomCursor from "@/components/layout/CustomCursor";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: SITE.title, template: '%s — ADNAN' },
  description: SITE.description,
  authors: [{ name: SITE.author }], creator: SITE.author,
  openGraph: { type: 'website', locale: 'en_US', siteName: SITE.title, title: SITE.title, description: SITE.description, images: [SITE.shareImage] },
  twitter: { card: 'summary_large_image', title: SITE.title, description: SITE.description, images: [SITE.shareImage] },
  robots: { index: siteIndexable, follow: siteIndexable },
  icons: { icon: '/icon.svg', shortcut: '/icon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-background text-text antialiased overflow-x-hidden">
        <CustomCursor />
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
