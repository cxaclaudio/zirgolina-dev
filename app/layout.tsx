import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zirgolina — Encontra o combustível mais barato!",
  description:
    "Filtra pela tua zona. Encontra o preço mais baixo! Apenas Portugal Continental.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${inter.variable} ${plusJakarta.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}