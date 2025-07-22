import type { UnifiedResponse } from "@figgy/nlq";

export interface FormattedResponse {
  text: string;
  quickReplies?: string[] | undefined;
  metadata?: Record<string, any> | undefined;
}

export interface ResponseFormatter {
  format(response: UnifiedResponse): FormattedResponse;
}

export class WhatsAppResponseFormatter implements ResponseFormatter {
  format(response: UnifiedResponse): FormattedResponse {
    // Check if responseText is provided in metadata - if so, use it directly
    if ((response.metadata as any).responseText) {
      return {
        text: (response.metadata as any).responseText,
        quickReplies: response.suggestions || undefined,
      };
    }

    // Generate summary based on result type
    let text = this.generateSummary(response);

    // Add data display if present
    if (
      response.results.data &&
      Array.isArray(response.results.data) &&
      response.results.data.length > 0
    ) {
      const dataType = this.getDataType(response);
      text += `\n\n📊 *${response.results.data.length} ${dataType}*\n`;

      // Format each item
      response.results.data.slice(0, 10).forEach((item: any, index: number) => {
        text += `\n${index + 1}. `;

        // Format based on item structure
        if (item.fileName) {
          text += `📄 ${item.fileName}`;
          if (item.status) text += ` (${item.status})`;
        } else if (item.name) {
          text += item.name;
          if (item.amount) text += ` - £${item.amount}`;
        } else {
          text += JSON.stringify(item);
        }
      });

      if (response.results.data.length > 10) {
        text += `\n\n_...and ${response.results.data.length - 10} more_`;
      }
    }

    // Add processing time
    if (response.metadata.processingTimeMs) {
      text += `\n\n⏱️ _Processed in ${response.metadata.processingTimeMs}ms_`;
    }

    return {
      text,
      quickReplies: response.suggestions || undefined,
    };
  }

  private generateSummary(response: UnifiedResponse): string {
    switch (response.results.type) {
      case "count":
        return `Found ${response.results.data || 0} results`;
      case "list":
        return `Here are the results for your query`;
      case "aggregate":
        return `Here's the aggregated data`;
      case "summary":
        return typeof response.results.data === "string"
          ? response.results.data
          : "Query processed successfully";
      default:
        return "Query processed";
    }
  }

  private getDataType(response: UnifiedResponse): string {
    // Try to infer data type from the results
    if (response.intent.includes("file")) return "files";
    if (response.intent.includes("invoice")) return "invoices";
    if (response.intent.includes("document")) return "documents";
    return "records";
  }
}

export class SlackResponseFormatter implements ResponseFormatter {
  format(response: UnifiedResponse): FormattedResponse {
    // Check if responseText is provided in metadata - if so, use it directly
    if ((response.metadata as any).responseText) {
      return {
        text: (response.metadata as any).responseText,
        metadata: {
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: (response.metadata as any).responseText,
              },
            },
          ],
        },
      };
    }

    const summary = this.generateSummary(response);
    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: summary,
        },
      },
    ];

    // Add data display if present
    if (
      response.results.data &&
      Array.isArray(response.results.data) &&
      response.results.data.length > 0
    ) {
      const dataType = this.getDataType(response);
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${response.results.data.length} ${dataType} found:*`,
        },
      });

      // Format items as a list
      const items = response.results.data
        .slice(0, 10)
        .map((item: any, index: number) => {
          if (item.fileName) {
            return `${index + 1}. 📄 ${item.fileName} ${item.status ? `(${item.status})` : ""}`;
          } else if (item.name) {
            return `${index + 1}. ${item.name} ${item.amount ? `- £${item.amount}` : ""}`;
          }
          return `${index + 1}. ${JSON.stringify(item)}`;
        })
        .join("\n");

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: items,
        },
      });

      if (response.results.data.length > 10) {
        blocks.push({
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_...and ${response.results.data.length - 10} more results_`,
            },
          ],
        });
      }
    }

    // Add suggested questions as buttons
    if (response.suggestions && response.suggestions.length > 0) {
      blocks.push({
        type: "actions",
        elements: response.suggestions.map((q: string) => ({
          type: "button",
          text: {
            type: "plain_text",
            text: q,
          },
          value: q,
        })),
      });
    }

    return {
      text: summary,
      metadata: { blocks },
    };
  }

  private generateSummary(response: UnifiedResponse): string {
    switch (response.results.type) {
      case "count":
        return `Found ${response.results.data || 0} results`;
      case "list":
        return `Here are the results for your query`;
      case "aggregate":
        return `Here's the aggregated data`;
      case "summary":
        return typeof response.results.data === "string"
          ? response.results.data
          : "Query processed successfully";
      default:
        return "Query processed";
    }
  }

  private getDataType(response: UnifiedResponse): string {
    // Try to infer data type from the results
    if (response.intent.includes("file")) return "files";
    if (response.intent.includes("invoice")) return "invoices";
    if (response.intent.includes("document")) return "documents";
    return "records";
  }
}

export class ApiResponseFormatter implements ResponseFormatter {
  format(response: UnifiedResponse): FormattedResponse {
    return {
      text: this.generateSummary(response),
      metadata: response,
    };
  }

  private generateSummary(response: UnifiedResponse): string {
    switch (response.results.type) {
      case "count":
        return `Found ${response.results.data || 0} results`;
      case "list":
        return `Here are the results for your query`;
      case "aggregate":
        return `Here's the aggregated data`;
      case "summary":
        return typeof response.results.data === "string"
          ? response.results.data
          : "Query processed successfully";
      default:
        return "Query processed";
    }
  }
}
