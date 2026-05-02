import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "./components/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Calorie Tracker",
  description: "Personal nutrition and calorie tracker",
  manifest: "/calorie-tracker/manifest.json",
  icons: {
    icon: "/calorie-tracker/icon.png",
    apple: "/calorie-tracker/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Calorie Tracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#faf9fe",
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
    <html lang="de" className={`${inter.variable}`}>
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

