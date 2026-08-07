import type { Metadata } from "next";
import "./globals.css";

const isStaging = process.env.APP_ENV === "staging";

export const metadata: Metadata = {
  title: "CostaSpanish - Aula Virtual",
  description: "Aprende español con expertos",
  icons: {
    icon: "/assets/LogoCostaSpanishRojoCoralFuerte.png",
  },
  robots: isStaging
    ? {
        index: false,
        follow: false,
        nocache: true,
      }
    : {
        index: true,
        follow: true,
      },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
