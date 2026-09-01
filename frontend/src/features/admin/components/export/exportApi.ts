import { ApiResponse, apiDownload, apiRequest, DownloadedFile } from "../../../../api/apiClient";
import {
  AiExportPrivacy,
  ExportAvailability,
  ExportKind,
  ExportPreview,
  InitiativeExportFilter,
} from "./exportTypes";

export const loadExportAvailability = (
  signal?: AbortSignal,
  includeCustomFields = false,
  kinds?: ExportKind[],
) => {
  const params = new URLSearchParams();
  if (includeCustomFields) params.set("include_custom_fields", "true");
  kinds?.forEach((kind) => params.append("kinds", kind));
  const query = params.toString();
  return apiRequest<ApiResponse<ExportAvailability>>(
    `/exports/availability${query ? `?${query}` : ""}`,
    { signal },
  ).then((response) => response.data);
};

export const loadExportPreview = (filter: InitiativeExportFilter, signal?: AbortSignal) =>
  apiRequest<ApiResponse<ExportPreview>>("/exports/preview", {
    method: "POST",
    body: JSON.stringify(filter),
    signal,
  }).then((response) => response.data);

export const downloadExcel = (filter: InitiativeExportFilter, signal?: AbortSignal) =>
  apiDownload("/exports/excel", filter, "PMO_Hub.xlsx", signal);

export const downloadAiJson = (
  filter: InitiativeExportFilter,
  privacy: AiExportPrivacy,
  signal?: AbortSignal,
) => apiDownload("/exports/json/ai", { ...filter, privacy }, "PMO_Hub_AI.json", signal);

export const downloadFullJson = (signal?: AbortSignal) =>
  apiDownload("/exports/json/full", {}, "PMO_Hub_FULL.json", signal);

export const saveDownloadedFile = ({ blob, filename }: DownloadedFile) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
