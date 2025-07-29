import type { UnifiedResponse } from "@figgy/nlq";

export interface FormattedMessage {
  text: string;
  attachments?: any[];
  quickReplies?: string[];
  metadata?: Record<string, any>;
}

export abstract class BaseFormatter {
  abstract format(response: UnifiedResponse): FormattedMessage;

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
  }

  protected formatCurrency(value: number, currency = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  }

  protected formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  protected formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  protected formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3)}...`;
  }

  protected getStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      pending: "⏳",
      processing: "⚙️",
      completed: "✅",
      failed: "❌",
      success: "✅",
      error: "❌",
    };
    return statusEmojis[status] || "📄";
  }

  protected getDocumentTypeEmoji(type: string): string {
    const typeEmojis: Record<string, string> = {
      invoice: "📄",
      receipt: "🧾",
      purchase_order: "📋",
      credit_note: "💳",
      quote: "💰",
      contract: "📑",
      statement: "📊",
      other: "📎",
    };
    return typeEmojis[type] || "📄";
  }

  protected getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.5) return "Medium";
    return "Low";
  }

  protected getConfidenceEmoji(confidence: number): string {
    if (confidence >= 0.8) return "🟢";
    if (confidence >= 0.5) return "🟡";
    return "🔴";
  }
}
