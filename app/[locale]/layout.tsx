import { notFound } from "next/navigation";

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
      <body>{children}</body>
    </html>
  );
}
