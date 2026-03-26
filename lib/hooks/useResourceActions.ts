"use client";

import { ResourceDetailDTO, ResourceListItemDTO } from "@/lib/dto/resource.dto";
import { toast } from "sonner";
import { deleteObject, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { mutate } from "swr";
import { useState } from "react";
import { ArchiveResourceFormData } from "@/components/dashboard/resources/ArchiveResourceForm";
import { useRouter, usePathname, useParams } from 'next/navigation';
type ResourceMenuAction = "ARCHIVE" | "ADD_TO_CLASS";
export function useResourceActions(resources: ResourceListItemDTO[] | ResourceDetailDTO) {


  const router = useRouter();
  const pathname = usePathname();

  const params = useParams();
  const locale = params.locale as string;
  
  const [resourceToArchive, setResourceToArchive] = useState<string | null>(
    null,
  );
  const [resourceToArchiveName, setResourceToArchiveName] = useState<
    string | null
  >(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isSubmittingArchiveResource, setIsSubmittingArchiveResource] =
    useState(false);
 
  const [isDeleteResourceModalOpen, setIsDeleteResourceModalOpen] =
    useState(false);
  const [isDelettingResource, setIsDelettingResource] = useState(false);

  const [isSubmittingReactivateResource, setIsSubmittingReactivateResource] =
    useState(false);
  const [archivingResource, setArchivingResource] = useState<string | null>(
    null,
  );
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [isSubmittingAddResource, setIsSubmittingAddResource] = useState(false);

   const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  
const handleActionClick = (
    action: ResourceMenuAction,
    resourceId: string | null,
  ) => {
    if (action === "ARCHIVE") {
      setArchivingResource(resourceId);
      setIsArchiveModalOpen(true);
      setMenuPosition(null);
    } else if (action === "ADD_TO_CLASS") {
      setArchivingResource(resourceId);
      setIsAddResourceModalOpen(true);
      setMenuPosition(null);
    }
  };

  const handleAddResourceToLesson = async (
    resourceId: string | null,
    lessonId: string,
  ) => {
    console.log("Hola!"); //!Subida
  };

  const handleArchiveResource = async (
    resourceId: string | null,
    formData: ArchiveResourceFormData,
  ) => {
    setIsSubmittingArchiveResource(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "archived",
          visibility: "private",
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData || "Error al archivar el recurso.");
      }
      toast.success("Recurso archivado con exito.");
      mutate("/api/resources");
      if (pathname.includes(resourceId as string)) {
        router.refresh(); 
      }
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error("Ocurrió un error inesperado al archivar el recurso.");
    } finally {
      setIsSubmittingArchiveResource(false);
      setIsArchiveModalOpen(false);
    }
  };

  const handleReactivateResource = async (resourceId: string | null) => {
    setIsSubmittingReactivateResource(true);
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "draft",
          visibility: "private",
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al reactivar el recurso.");
      }
      toast.success("Recurso reactivado con éxito.");
      mutate("/api/resources");
      if (pathname.includes(resourceId as string)) {
        router.refresh(); 
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "Ocurrió un error inesperado.");
      } else {
        toast.error("Error al reactivar el recurso.");
      }
    } finally {
      setIsSubmittingReactivateResource(false);
    }
  };

  const handlePermanentDelete = async (resourceId: string | null) => {
    if (!resourceId) return;
    
    const resource = Array.isArray(resources) 
      ? resources.find((r) => r.id === resourceId)
      : (resources.id === resourceId ? resources : null);
 
    if (!resource) {
      toast.error("No se encontró el recurso en la memoria.");
      return;
    }
    setIsDelettingResource(true);
    try {
      if (resource.asset.storagePath) {
        const fileRef = ref(storage, resource.asset.storagePath);
        await deleteObject(fileRef).catch((err) =>
          console.warn("El archivo ya no existía en Firebase o falló:", err),
        );
      }

      if (resource.asset.thumbnailStoragePath) {
        const thumbRef = ref(storage, resource.asset.thumbnailStoragePath);
        await deleteObject(thumbRef).catch((err) =>
          console.warn("La miniatura ya no existía en Firebase o falló:", err),
        );
      }

      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "DELETE",
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        console.error("ERROR:", errorData);

        toast.error(
          `Error BD: ${JSON.stringify(errorData.error || errorData)}`,
        );

        throw new Error("Abortando operación por error del servidor");
      }

      toast.success("Recurso y archivos eliminados definitivamente.");
      mutate("/api/resources");
      if (pathname.includes(resourceId as string)) {
        router.push(`/${locale}/dashboard/resources`); 
        router.refresh(); 
      }
    } catch (error) {
      toast.error("Ocurrió un error al eliminar el recurso.");
      console.error(error);
    } finally {
      setIsDelettingResource(false);
      setIsDeleteResourceModalOpen(false);
    }
  };

  return {
    // --- ESTADOS DE DATOS ---
    resourceToArchive,
    setResourceToArchive,
    resourceToArchiveName,
    setResourceToArchiveName,

    isAddResourceModalOpen,
    setIsAddResourceModalOpen,


    // --- ESTADOS DE MODALES ---
    isArchiveModalOpen,
    setIsArchiveModalOpen,

    isDeleteResourceModalOpen,
    setIsDeleteResourceModalOpen,

    // --- ESTADOS DE CARGA (Loading) ---
    isSubmittingArchiveResource,
    isDelettingResource,
    isSubmittingReactivateResource,
    isSubmittingAddResource,
    // --- FUNCIONES Y HANDLERS ---
    handleAddResourceToLesson,
    handleArchiveResource,
    handleReactivateResource,
    handlePermanentDelete,
    handleActionClick
  };
}