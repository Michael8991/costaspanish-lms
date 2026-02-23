import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CostaSpanish - Aula Virtual",
  description: "Aprende español con expertos",
  icons: {
    icon: "/assets/LogoCostaSpanishRojoCoralFuerte.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
