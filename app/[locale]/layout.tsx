import { notFound } from "next/navigation";

import { Varela_Round } from "next/font/google";

const varela = Varela_Round({
  subsets: ["latin"],
  weight: ["400"], // Los grosores que vayas a usar
});

const SUPPORTED = ["en", "es"] as const;
type SupportedLocale = (typeof SUPPORTED)[number];

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED as readonly string[]).includes(locale);
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) notFound();

  return (
    <html lang={locale}>
      <body className={varela.className}>{children}</body>
    </html>
  );
}
