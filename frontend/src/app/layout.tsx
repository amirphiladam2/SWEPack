import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://swepack.vercel.app"),
  title: "SWEPack — Resources for builders",
  description: "A carefully organized library of software resources.",
  openGraph: {
    type: "website",
    url: "https://swepack.vercel.app",
    siteName: "SWEPack",
    title: "SWEPack — Resources for builders",
    description: "A carefully organized library of software resources.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "SWEPack developer resource library",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SWEPack — Resources for builders",
    description: "A carefully organized library of software resources.",
    images: [
      {
        url: "/og-image.jpg",
        alt: "SWEPack developer resource library",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={`min-h-full ${geist.variable}`}>
        <QueryProvider>
          <AuthSessionProvider>
            <div className="app-shell flex min-h-screen flex-col text-[var(--text)]">
              <Navbar />
              <div className="flex flex-1 flex-col">{children}</div>
              <SiteFooter />
            </div>
          </AuthSessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
