import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Providers from "@/components/Providers";
import ErrorBoundary from "@/components/ErrorBoundary";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-library.vercel.app";
const LOGO_URL = "https://www.image2url.com/r2/default/images/1776215661522-3ce7e2b6-4b67-46d7-898b-85a767165977.png";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "مكتبة العلي الرقمية | Al-Ali Digital Library",
    template: "%s | مكتبة العلي الرقمية",
  },
  description:
    "مكتبة العلي الرقمية — منصة إلكترونية متقدمة متخصصة في الدراسات الإسلامية والفكر الشيعي الإمامي. تضم مكتبة شاملة للكتب الإسلامية في التفسير والعقائد والفقه والمنطق والفلسفة والتاريخ والأدعية. مدعومة بالذكاء الاصطناعي للتلخيص والتدقيق والبحث المتطور.",
  keywords: [
    "مكتبة العلي",
    "Al-Ali Digital Library",
    "كتب إسلامية",
    "فكر شيعي",
    "عقائد",
    "تفسير القرآن",
    "فقه جعفري",
    "منطق",
    "فلسفة إسلامية",
    "تاريخ الإسلام",
    "أدعية",
    "كتب دينية",
    "بحوث إسلامية",
    "الإمام علي",
    "أهل البيت",
    "أئمة الشيعة",
    "نهج البلاغة",
    "الصحيفة السجادية",
    "الكافي",
    "مكتبة شيعية",
    "مكتبة إسلامية رقمية",
    "دراسات إسلامية",
    "ذكاء اصطناعي",
    "تلخيص نصوص",
    "تدقيق بحوث",
    "بحث متطور",
  ],
  authors: [{ name: "مكتبة العلي الرقمية", url: SITE_URL }],
  creator: "مكتبة العلي الرقمية",
  publisher: "مكتبة العلي الرقمية",
  icons: {
    icon: LOGO_URL,
    apple: LOGO_URL,
  },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    url: SITE_URL,
    siteName: "مكتبة العلي الرقمية",
    title: "مكتبة العلي الرقمية — مكتبة إسلامية رقمية شاملة",
    description:
      "منصة إلكترونية متخصصة في الدراسات الإسلامية والفكر الشيعي الإمامي. تضم كتب التفسير والعقائد والفقه والمنطق والفلسفة والتاريخ والأدعية مع أدوات ذكاء اصطناعي متقدمة.",
    images: [
      {
        url: LOGO_URL,
        width: 512,
        height: 512,
        alt: "مكتبة العلي الرقمية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "مكتبة العلي الرقمية — مكتبة إسلامية رقمية شاملة",
    description:
      "منصة إلكترونية متخصصة في الدراسات الإسلامية والفكر الشيعي. كتب التفسير والعقائد والفقه مع أدوات ذكاء اصطناعي.",
    images: [LOGO_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "education",
  classification: "مكتبة إسلامية رقمية - دراسات دينية - كتب شيعية",
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
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
