import type { Metadata } from "next";
import { appConfig } from "@/lib/appConfig";
import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  icons: {
    icon: appConfig.logoSrc,
    apple: appConfig.logoSrc,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
