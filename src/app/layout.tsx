import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "مكتبة العلي الرقمية | Al-Ali Digital Library",
  description: "مختبر بحثي ذكي متخصص في الدراسات الإسلامية والفكر الشيعي. يتضمن أدوات تلخيص، تدقيق بحوث، ومحاور عقائدي بالذكاء الاصطناعي.",
  keywords: ["مكتبة العلي", "Al-Ali Digital Library", "فكر شيعي", "بحوث دينية", "ذكاء اصطناعي"],
  icons: {
    icon: "https://www.image2url.com/r2/default/images/1776215661522-3ce7e2b6-4b67-46d7-898b-85a767165977.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#0a0a0f', color: '#e2e8f0' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
