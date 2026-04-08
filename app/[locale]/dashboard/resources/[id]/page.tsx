import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { toResourceDetailDTO } from "@/lib/dto/resource.dto";
import dbConnect from "@/lib/mongo";
import { Resource } from "@/models/ResourceProfile";
import { Types } from "mongoose";
import { notFound } from "next/navigation";
import HeaderResource from "@/components/dashboard/resources/resourceDetails/HeaderResource";
import PreviewResourceSection from "@/components/dashboard/resources/resourceDetails/PreviewResourceSection";
import { TechnicalMetadataSection } from "@/components/dashboard/resources/resourceDetails/TechnicalMetadataSection";
import { PedagogicalDetailsSection } from "@/components/dashboard/resources/resourceDetails/PedagogicalDetailsSection";
import TranscriptionPreviewSection from "@/components/dashboard/resources/resourceDetails/TranscriptionPreviewSection";

export default async function ResourcePage({
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
    { label: resource.title },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 text-slate-800 md:px-8">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />

      <div className="mt-5 grid grid-cols-4 gap-4">
        <div className="flex flex-col gap-2">
          <PreviewResourceSection resource={resource} locale={locale} />
          <TechnicalMetadataSection resource={resource} locale={locale} />
        </div>
        <div className="col-span-3 flex flex-col gap-2">
          <HeaderResource resource={resource} locale={locale} />
          {resource.asset.format === "audio" ? (
            <TranscriptionPreviewSection
              transcription={resource.storage.transcriptText}
            />
          ) : (
            ""
          )}
          <PedagogicalDetailsSection resource={resource} locale={locale} />
        </div>
      </div>
    </div>
  );
}
