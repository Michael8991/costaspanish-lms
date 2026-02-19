import { redirect } from "next/navigation";

export default function LocaleIndex({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/dashboard`);
}
