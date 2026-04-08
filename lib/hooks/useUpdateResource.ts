import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { updateResourceSchema } from "../validators/resource";
import { AddResourcePayload } from "../utils/resource-mappers";
import { FormatType } from "../constants/resource.constants";
import z from "zod";
import { useState } from "react";

type Step = 1 | 2;

type UploadedResourceMeta = {
  storagePath?: string;
  fileUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  pageCount?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;
  fileSizeBytes?: number;
};

type UpdateResourceValues = z.infer<typeof updateResourceSchema>;

type UseUpdateResourceFormProps = {
  onSubmit: (payload: AddResourcePayload) => Promise<void> | void;
  onUploadFile?: (
    file: File,
    format: Exclude<FormatType, "external_link">,
  ) => Promise<UploadedResourceMeta>;
  initialValues?: Partial<UpdateResourceValues>;
};

export const useUpdateResourceForm = ({initialValues={}}: UseUpdateResourceFormProps) => {
  const [step, setStep] = useState<Step>(1);
  const [uploadMessage, setUploadMessage] = useState<string>("");
  
    const [uploadError, setUploadError] = useState<string>("");
  
  const form = useForm<z.input<typeof updateResourceSchema>>({
    resolver: zodResolver(updateResourceSchema),
    mode: "onTouched",
    defaultValues: {
      storagePath: "",
      fileUrl: "",
      originalFilename: "",
      mimeType: "",
      thumbnailUrl: "",
      thumbnailStoragePath: "",
      externalUrl: "",
      ...initialValues,
    },
  });

  const { setValue } = form;

  const handleFormatSelection = (format: FormatType): void => {
    setUploadError("");
    setUploadMessage("");

    if (format === "external_link") {
      setValue("storagePath", "");
      setValue("fileUrl", "");
      setValue("originalFilename", "");
      setValue("mimeType", "");
      setValue("fileSizeBytes", undefined);
      setValue("pageCount", undefined);
      setValue("durationSeconds", undefined);
      setValue("thumbnailUrl", "");
    } else {
      setValue("externalUrl", "");
    }

    if (format !== "pdf") {
      setValue("pageCount", undefined);
    }

    if (format !== "audio" && format !== "video") {
      setValue("durationSeconds", undefined);
    }
    setValue("format", format, { shouldValidate: true, shouldDirty: true });

    if (step === 1) setStep(2);
  };

  return {
    form,         
    step,
    setStep,
    handleFormatSelection,
  };
}