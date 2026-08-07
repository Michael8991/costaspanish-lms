"use client";

import AddResourceForm from "@/components/dashboard/resources/AddResourceForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { processAndUploadResource } from "@/lib/resource/upload/processResourceUpload";
import { AddResourcePayload } from "@/lib/utils/resource-mappers";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AddResourcePage() {
  const params = useParams();
  const locale = params.locale as string;

  const breadcrumbItems = [
    { label: "Resources", href: `/${locale}/dashboard/resources` },
    { label: "New Resource" },
  ];

  const router = useRouter();

  const handleSubmitResource = async (payload: AddResourcePayload) => {
    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = (await response.json()) as {
        error?: string;
        item?: unknown;
      };

      if (!response.ok) {
        console.error("[CREATE RESOURCE ERROR]", {
          status: response.status,
          statusText: response.statusText,
          body: responseData,
        });
        throw new Error(
          responseData.error ??
            `Error al crear un nuevo recurso (${response.status})`,
        );
      }

      toast.success("Material añadido a la biblioteca!");

      router.push(`/${locale}/dashboard/resources`);
      router.refresh();
    } catch (error) {
      console.log("Error al guardar", error);
      toast.error(error instanceof Error ? error.message : "Error desconocido");
      throw error;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <AddResourceForm
        onSubmit={handleSubmitResource}
        onUploadFile={processAndUploadResource}
      />
    </div>
  );
}
