import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casal do Açaí",
  description:
    "A calculadora de custo (CMV) e preço do seu copo de açaí. Descubra quanto custa e por quanto vender cada tamanho.",
  applicationName: "Casal do Açaí",
};

export const viewport: Viewport = {
  themeColor: "#65037E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
