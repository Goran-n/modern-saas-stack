import type { FileItem } from "@figgy/types";

export interface FileServiceError {
  code:
    | "NETWORK_ERROR"
    | "PERMISSION_DENIED"
    | "FILE_NOT_FOUND"
    | "PROCESSING_ERROR";
  message: string;
  details?: unknown;
}

export interface FileOperation {
  fileId: string;
  type: "download" | "reprocess" | "delete" | "update";
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: FileServiceError;
}

/**
 * Centralised file service for all file operations
 * Single source of truth for file management
 */
export const useFileService = () => {
  // Operation tracking
  const operations = ref<Map<string, FileOperation>>(new Map());
  const errors = ref<FileServiceError[]>([]);

  // Loading states
  const isOperationInProgress = (
    fileId: string,
    type?: FileOperation["type"],
  ) => {
    const op = operations.value.get(fileId);
    if (!op) return false;
    if (type && op.type !== type) return false;
    return op.status === "in_progress";
  };

  // Error handling
  const handleError = (
    error: unknown,
    code: FileServiceError["code"],
  ): FileServiceError => {
    const fileError: FileServiceError = {
      code,
      message:
        error instanceof Error ? error.message : "An unknown error occurred",
      details: error,
    };
    errors.value.push(fileError);
    return fileError;
  };

  const clearErrors = () => {
    errors.value = [];
  };

  // Track operation
  const trackOperation = (
    fileId: string,
    type: FileOperation["type"],
  ): FileOperation => {
    const operation: FileOperation = {
      fileId,
      type,
      status: "pending",
    };
    operations.value.set(fileId, operation);
    return operation;
  };

  const updateOperation = (fileId: string, updates: Partial<FileOperation>) => {
    const op = operations.value.get(fileId);
    if (op) {
      operations.value.set(fileId, { ...op, ...updates });
    }
  };

  // Core operations
  const downloadFile = async (
    file: FileItem,
    options?: {
      apiUrl?: string;
      tenantId?: string;
    },
  ): Promise<boolean> => {
    trackOperation(file.id, "download");

    try {
      updateOperation(file.id, { status: "in_progress" });

      const baseUrl = options?.apiUrl || "/api";
      const tenantId = options?.tenantId;

      if (!tenantId) {
        throw new Error("Tenant ID is required for file download");
      }

      const downloadUrl = `${baseUrl}/files/download/${file.id}?tenantId=${tenantId}`;

      // Open in new window for download
      window.open(downloadUrl, "_blank");

      updateOperation(file.id, { status: "completed" });
      return true;
    } catch (error) {
      const fileError = handleError(error, "NETWORK_ERROR");
      updateOperation(file.id, { status: "failed", error: fileError });
      return false;
    }
  };

  const reprocessFile = async (
    fileId: string,
    onReprocess?: (fileId: string) => Promise<void>,
  ): Promise<boolean> => {
    trackOperation(fileId, "reprocess");

    try {
      updateOperation(fileId, { status: "in_progress" });

      if (!onReprocess) {
        throw new Error("Reprocess handler not provided");
      }

      await onReprocess(fileId);

      updateOperation(fileId, { status: "completed" });
      return true;
    } catch (error) {
      const fileError = handleError(error, "PROCESSING_ERROR");
      updateOperation(fileId, { status: "failed", error: fileError });
      return false;
    }
  };

  const getProxyUrl = (
    fileId: string,
    options?: {
      apiUrl?: string;
      tenantId?: string;
      toolbar?: boolean;
    },
  ): string | null => {
    if (!fileId || !options?.tenantId) return null;

    const baseUrl = options.apiUrl || "/api";
    const toolbar = options.toolbar ?? false;

    return `${baseUrl}/files/proxy/${fileId}?tenantId=${options.tenantId}${toolbar ? "" : "#toolbar=0"}`;
  };

  const getDownloadUrl = (
    fileId: string,
    options?: {
      apiUrl?: string;
      tenantId?: string;
    },
  ): string | null => {
    if (!fileId || !options?.tenantId) return null;

    const baseUrl = options.apiUrl || "/api";
    return `${baseUrl}/files/download/${fileId}?tenantId=${options.tenantId}`;
  };

  // Drag & drop support
  const createFileDragData = (file: FileItem, tenantId?: string) => {
    const fileName = file.metadata?.displayName || file.fileName;

    return {
      type: "figgy-file",
      fileId: file.id,
      fileName,
      tenantId,
      mimeType: file.mimeType,
      size: file.size,
    };
  };

  const handleFileDragStart = (
    event: DragEvent,
    file: FileItem,
    tenantId?: string,
  ) => {
    const dragData = createFileDragData(file, tenantId);

    event.dataTransfer!.effectAllowed = "copy";
    event.dataTransfer!.setData(
      "application/x-figgy-file",
      JSON.stringify(dragData),
    );
    event.dataTransfer!.setData("text/plain", JSON.stringify(dragData));

    // Create drag preview
    const dragImage = createDragPreview(file.fileName);
    event.dataTransfer!.setDragImage(dragImage, 0, 0);

    // Clean up after drag starts
    setTimeout(() => dragImage.remove(), 0);
  };

  const createDragPreview = (fileName: string): HTMLElement => {
    const preview = document.createElement("div");
    preview.className = "fixed -top-[1000px] left-0 pointer-events-none";
    preview.innerHTML = `
      <div class="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-xl border border-neutral-200">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" class="text-neutral-500">
          <path d="M10 2L4 2C2.89543 2 2 2.89543 2 4V16C2 17.1046 2.89543 18 4 18H16C17.1046 18 18 17.1046 18 16V8L12 2H10Z" stroke="currentColor" stroke-width="2"/>
          <path d="M10 2V8H16" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span class="text-sm font-medium text-neutral-700 max-w-[200px] truncate">${fileName}</span>
      </div>
    `;
    document.body.appendChild(preview);
    return preview;
  };

  // Batch operations
  const batchDownload = async (
    files: FileItem[],
    options?: {
      apiUrl?: string;
      tenantId?: string;
    },
  ): Promise<{ successful: string[]; failed: string[] }> => {
    const results = {
      successful: [] as string[],
      failed: [] as string[],
    };

    for (const file of files) {
      const success = await downloadFile(file, options);
      if (success) {
        results.successful.push(file.id);
      } else {
        results.failed.push(file.id);
      }
    }

    return results;
  };

  // Computed states
  const hasErrors = computed(() => errors.value.length > 0);
  const latestError = computed(() => errors.value[errors.value.length - 1]);
  const activeOperations = computed(() =>
    Array.from(operations.value.values()).filter(
      (op) => op.status === "in_progress",
    ),
  );

  return {
    // Core operations
    downloadFile,
    reprocessFile,
    getProxyUrl,
    getDownloadUrl,

    // Drag & drop
    handleFileDragStart,
    createFileDragData,

    // Batch operations
    batchDownload,

    // Operation tracking
    isOperationInProgress,
    operations: computed(() => operations.value),
    activeOperations,

    // Error handling
    errors: computed(() => errors.value),
    hasErrors,
    latestError,
    clearErrors,

    // Utilities
    handleError,
    trackOperation,
    updateOperation,
  };
};

// Type-safe file service hook with proper error handling
export type FileService = ReturnType<typeof useFileService>;
