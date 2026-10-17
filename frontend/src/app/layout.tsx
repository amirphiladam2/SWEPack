import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "SWEPack — Resources for builders",
  description: "A carefully organized library of software resources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-full">
        <QueryProvider>
          <div className="app-shell flex min-h-screen flex-col text-[var(--text)]">
            <Navbar />
            <div className="flex flex-1 flex-col">{children}</div>
            <SiteFooter />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
