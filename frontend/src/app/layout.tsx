import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SWEPack — Resources for builders",
  description: "A carefully organized library of software resources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
