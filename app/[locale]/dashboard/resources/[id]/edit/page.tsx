import FormSection from "@/components/dashboard/resources/edit/fields/FormSection";
import { ResourceDetailDTO, toResourceDetailDTO } from "@/lib/dto/resource.dto";
import dbConnect from "@/lib/mongo";
import { Resource } from "@/models/ResourceProfile";
import { Types } from "mongoose";
import { notFound } from "next/navigation";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }

  await dbConnect();
  const rawResource = await Resource.findById(id).lean();

  if (!rawResource) {
    notFound();
  }

  const resource = toResourceDetailDTO(rawResource);

  const breadcrumbItems = [
    { label: "Resources", href: `/${locale}/dashboard/resources` },
    { label: resource.title, href: `/${locale}/dashboard/resources/${id}` },
    { label: "Editing" },
  ];

  return <FormSection resource={resource} locale={locale} />;
}
