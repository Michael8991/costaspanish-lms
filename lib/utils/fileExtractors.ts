"use client";

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null =
  null;

async function getPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction must run in the browser.");
  }

  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      return pdfjsLib;
    });
  }

  return pdfjsPromise;
}

export const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith("video/");
    const element = document.createElement(isVideo ? "video" : "audio");
    const objectUrl = URL.createObjectURL(file);

    element.preload = "metadata";

    element.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Math.round(element.duration));
    };

    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la metadata del medio"));
    };

    element.src = objectUrl;
  });
};

export const extractPdfMetadata = async (
  file: File
): Promise<{ pageCount: number; thumbnailBlob: Blob }> => {
  const pdfjsLib = await getPdfJs();
  let pdf: import("pdfjs-dist/legacy/build/pdf.mjs").PDFDocumentProxy | null = null;

  try {
    const arrayBuffer = await file.arrayBuffer();

    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageCount = pdf.numPages;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo crear el contexto 2D del canvas");
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({
      canvasContext: context,
        viewport,
      canvas
    }).promise;

    const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Falló la conversión a Blob"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.8
      );
    });

    return { pageCount, thumbnailBlob };
  } catch (error) {
    console.error("Error al extraer metadata del PDF:", error);
    throw new Error("No se pudo leer el archivo PDF");
  } finally {
    await pdf?.destroy();
  }
};