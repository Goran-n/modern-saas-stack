import type { Size } from "../../../types";

export interface FileIconProps {
  /**
   * The file name including extension
   */
  fileName: string;

  /**
   * Optional MIME type for more accurate icon selection
   */
  mimeType?: string;

  /**
   * Size of the icon
   */
  size?: Size;
}

export interface FileIconConfig {
  icon: string;
  colorClass: string;
  label: string;
}
