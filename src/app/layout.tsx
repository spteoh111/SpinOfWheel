import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "白雁气功 Spin the Wheel",
  description: "Pick a random name from a Google Sheet and play their YouTube video.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
