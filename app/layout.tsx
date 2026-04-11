import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flixoo Admin - Panel de Control",
  description: "Panel de administración para Flixoo Streaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
