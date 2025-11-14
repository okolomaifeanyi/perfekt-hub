import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Metadata } from "next";
import ClientLayout from "@/components/ClientLayout";
import { appInfo } from "@/lib/appInfo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // metadataBase: new URL(appInfo.website),
  title: appInfo.title,
  description: appInfo.description,
  alternates: {
    canonical: "/",
  },
  authors: [{ name: appInfo.owner }],
  creator: appInfo.developer.name,
  publisher: appInfo.owner,
  keywords: appInfo.keywords,
  robots: "index, follow",
  openGraph: {
    title: appInfo.title,
    siteName: appInfo.title,
    type: "website",
    description: appInfo.description,
    // url: appInfo.website,
    // images: [{ url: "/opengraph-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: appInfo.title,
    description: appInfo.description,
    // images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
