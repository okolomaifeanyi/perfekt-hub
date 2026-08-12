import "./globals.css";
import { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import ClientLayout from "@/components/ClientLayout";
import { appInfo } from "@/lib/appInfo";
import { BUTTON_SHADOW_VARS } from "@/lib/button-shadow.mjs";
import { BODY_BACKGROUND_STYLE } from "@/lib/theme-background.mjs";
import { buildSiteMetadata } from "@/lib/site-metadata.mjs";
import type { CSSProperties, ReactNode } from "react";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const siteMetadata = buildSiteMetadata({
  canonical: appInfo.url,
  title: appInfo.title,
  description: appInfo.description,
});

export const metadata: Metadata = {
  ...siteMetadata,
  title: appInfo.title,
  description: appInfo.description,
  authors: [{ name: appInfo.owner }],
  creator: appInfo.developer.name,
  publisher: appInfo.owner,
  keywords: appInfo.keywords,
  openGraph: {
    ...siteMetadata.openGraph,
    siteName: appInfo.title,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must run synchronously before first paint, or dark-mode users see
            a flash of the light theme while React hydrates and ThemeProvider's
            effect corrects it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("theme");var t=(s==="light"||s==="dark"||s==="system")?s:"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} antialiased`}
        suppressHydrationWarning
        style={{ ...BUTTON_SHADOW_VARS, ...BODY_BACKGROUND_STYLE } as CSSProperties}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
