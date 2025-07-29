import type { FileItem } from "@figgy/types";

/**
 * Centralised state management for file operations
 * Manages processing states, selected files, and UI states
 */
export const useFileState = () => {
  // Global state using useState for cross-component reactivity
  const selectedFile = useState<FileItem | null>("selected-file", () => null);
  const viewMode = useState<"grid" | "list">("file-view-mode", () => "grid");
  const dragState = useState<{
    isDragging: boolean;
    draggedFile: FileItem | null;
  }>("file-drag-state", () => ({
    isDragging: false,
    draggedFile: null,
  }));

  // Reprocess modal state
  const reprocessModal = useState<{
    isOpen: boolean;
    file: FileItem | null;
    isProcessing: boolean;
  }>("reprocess-modal", () => ({
    isOpen: false,
    file: null,
    isProcessing: false,
  }));

  /**
   * Select a file for preview
   */
  const selectFile = (file: FileItem | null) => {
    selectedFile.value = file;
  };

  /**
   * Set the view mode
   */
  const setViewMode = (mode: "grid" | "list") => {
    viewMode.value = mode;
  };

  /**
   * Open reprocess modal
   */
  const openReprocessModal = (file: FileItem) => {
    reprocessModal.value = {
      isOpen: true,
      file,
      isProcessing: false,
    };
  };

  /**
   * Close reprocess modal
   */
  const closeReprocessModal = () => {
    reprocessModal.value = {
      isOpen: false,
      file: null,
      isProcessing: false,
    };
  };

  /**
   * Set reprocess modal processing state
   */
  const setReprocessModalProcessing = (isProcessing: boolean) => {
    reprocessModal.value.isProcessing = isProcessing;
  };

  /**
   * Start file drag
   */
  const startDrag = (file: FileItem) => {
    dragState.value = {
      isDragging: true,
      draggedFile: file,
    };
  };

  /**
   * End file drag
   */
  const endDrag = () => {
    dragState.value = {
      isDragging: false,
      draggedFile: null,
    };
  };

  return {
    // State
    selectedFile: readonly(selectedFile),
    viewMode: readonly(viewMode),
    dragState: readonly(dragState),
    reprocessModal: readonly(reprocessModal),

    // Methods
    selectFile,
    setViewMode,
    openReprocessModal,
    closeReprocessModal,
    setReprocessModalProcessing,
    startDrag,
    endDrag,
  };
};
