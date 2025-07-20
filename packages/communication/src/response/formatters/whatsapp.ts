import type { UnifiedResponse } from "@kibly/nlq";
import { BaseFormatter, type FormattedMessage } from "./base";

export class WhatsAppFormatter extends BaseFormatter {
  format(response: UnifiedResponse): FormattedMessage {
    const { results, metadata, suggestions, actions } = response;

    let text = "";
    const quickReplies: string[] = [];

    // Check if we have a pre-written conversational response
    if ((metadata as any).responseText) {
      text = (metadata as any).responseText;
    } else {
      // Generate response based on result type for file queries
      switch (results.type) {
        case "count":
          text = this.formatCountResult(results.data, response);
          break;
        
        case "list":
          text = this.formatListResult(results.data, response);
          break;
        
        case "aggregate":
          text = this.formatAggregateResult(results.data, response);
          break;
        
        case "summary":
          text = this.formatSummaryResult(results.data, response);
          break;
          
        default:
          // Check if this is an error response based on metadata
          if ((metadata as any).errorCode || (results as any).error) {
            text = this.formatErrorResult(response);
          } else {
            text = "I couldn't process your request. Please try rephrasing your question.";
          }
          break;
      }
    }

    // Only add suggestions and actions for successful file queries, not conversational responses or errors
    const isErrorResponse = !!(metadata as any).errorCode || !!(results as any).error;
    if (!(metadata as any).responseText && !isErrorResponse) {
      // Add suggestions as quick replies
      if (suggestions && suggestions.length > 0) {
        text += "\n\n💡 *You can also ask:*";
        suggestions.slice(0, 3).forEach((suggestion, index) => {
          text += `\n${index + 1}. ${suggestion}`;
          quickReplies.push(suggestion);
        });
      }

      // Add actions
      if (actions && actions.length > 0) {
        text += "\n\n*Actions:*";
        actions.forEach((action, index) => {
          text += `\n${index + 1}. ${action.label}`;
          quickReplies.push(action.label);
        });
      }

      // Add processing info in footer for low confidence queries
      if (metadata.confidence < 0.7) {
        text += "\n\n_Note: I'm not entirely sure I understood your query correctly. Try rephrasing if the results don't match your expectations._";
      }
    }
    
    // For error responses, add error-specific quick replies
    if (isErrorResponse && (metadata as any).suggestions) {
      const errorSuggestions = (metadata as any).suggestions as string[];
      errorSuggestions.slice(0, 3).forEach((suggestion: string) => {
        quickReplies.push(suggestion);
      });
    }

    return {
      text,
      quickReplies: quickReplies.slice(0, 5), // WhatsApp limits quick replies
      metadata: {
        queryId: metadata.queryId,
        processingTimeMs: metadata.processingTimeMs,
      },
    };
  }

  private formatCountResult(count: number, response: UnifiedResponse): string {
    const { filtersApplied } = response.metadata;
    
    let text = `You have ${this.formatNumber(count)} file${count !== 1 ? "s" : ""}`;

    if (filtersApplied.length > 0) {
      text += " matching your criteria";
      if (filtersApplied.length === 1 && filtersApplied[0]) {
        const filter = this.formatFilter(filtersApplied[0]);
        if (filter) {
          text += ` (${filter.toLowerCase()})`;
        }
      }
    } else {
      text += " in total";
    }

    text += ".";
    return text;
  }

  private formatListResult(items: any[], response: UnifiedResponse): string {
    const { metadata } = response;
    
    if (!items || items.length === 0) {
      return "I couldn't find any files matching your search criteria. Try adjusting your filters or search terms.";
    }

    let text = `Here are your ${this.formatNumber(items.length)} file${items.length !== 1 ? "s" : ""}`;
    
    if ((metadata as any).totalCount && (metadata as any).totalCount > items.length) {
      text += ` (showing the first ${items.length} of ${this.formatNumber((metadata as any).totalCount)})`;
    }
    
    text += ":\n\n";

    // Format each item
    items.slice(0, 10).forEach((item, index) => {
      text += this.formatFileItem(item, index + 1);
    });

    if (items.length > 10) {
      text += `\n... and ${items.length - 10} more`;
    }

    return text;
  }

  private formatAggregateResult(data: any, response: UnifiedResponse): string {
    const { aggregation } = response.results.data;
    
    if (Array.isArray(data)) {
      // Grouped aggregation
      let text = `📊 *Aggregation Results*\n\n`;
      
      data.forEach(item => {
        text += `${this.getStatusEmoji(item.group || "📄")} *${item.group}*: ${this.formatAggregateValue(item.value, aggregation?.field)}\n`;
      });
      
      return text;
    } else {
      // Single value aggregation
      let text = `📊 *Calculation Result*\n\n`;
      text += `The ${aggregation?.type || "total"} is: *${this.formatAggregateValue(data, aggregation?.field)}*`;
      
      if (response.metadata.filtersApplied.length > 0) {
        text += "\n\nFilters applied:";
        response.metadata.filtersApplied.forEach(filter => {
          text += `\n• ${this.formatFilter(filter)}`;
        });
      }
      
      return text;
    }
  }

  private formatSummaryResult(data: any[], _response: UnifiedResponse): string {
    if (!data || data.length === 0) {
      return "You don't have any files in the system yet.";
    }

    let text = `Here's a breakdown of your files:\n\n`;
    let total = 0;

    data.forEach(item => {
      const count = item.count || 0;
      total += count;
      text += `${this.getStatusEmoji(item.status)} ${this.capitalizeFirst(item.status)}: ${this.formatNumber(count)}\n`;
    });

    text += `\nTotal: ${this.formatNumber(total)} files`;

    return text;
  }

  private formatErrorResult(response: UnifiedResponse): string {
    const { results, metadata } = response;
    const errorMessage = (results as any).error || (metadata as any).responseText || "An error occurred while processing your request";
    const suggestions = (metadata as any).suggestions || [];
    
    let text = `❌ ${errorMessage}`;
    
    if (suggestions.length > 0) {
      text += "\n\n💡 *Suggestions:*";
      suggestions.slice(0, 3).forEach((suggestion: string) => {
        text += `\n• ${suggestion}`;
      });
    }
    
    // Add helpful examples for parsing errors
    const errorCode = (metadata as any).errorCode;
    if (errorCode === "NLQ_PARSING_FAILED" || errorCode === "NLQ_INVALID_QUERY") {
      text += "\n\n*Example questions:*";
      text += "\n• How many files do I have?";
      text += "\n• Show me invoices from this month";
      text += "\n• List pending documents";
    }
    
    return text;
  }

  private formatFileItem(item: any, index: number): string {
    const file = item.file || item;
    const extraction = item.extraction;
    
    let text = `${index}. ${this.getStatusEmoji(file.processingStatus || "pending")} *${this.truncateText(file.fileName, 30)}*\n`;
    text += `   📅 ${this.formatDate(file.createdAt)} | 📦 ${this.formatFileSize(file.size)}\n`;
    
    if (extraction) {
      text += `   ${this.getDocumentTypeEmoji(extraction.documentType)} ${this.capitalizeFirst(extraction.documentType)}`;
      
      if (extraction.companyProfile?.normalizedName) {
        text += ` from ${extraction.companyProfile.normalizedName}`;
      }
      
      text += ` ${this.getConfidenceEmoji(extraction.overallConfidence)}\n`;
      
      if (extraction.extractedFields?.totalAmount?.value) {
        text += `   💰 ${this.formatCurrency(extraction.extractedFields.totalAmount.value)}\n`;
      }
    }
    
    text += "\n";
    return text;
  }

  private formatFilter(filter: string): string {
    const [key, value] = filter.split(":");
    const formattedKey = this.capitalizeFirst(key?.replace("_", " ") || "");
    const formattedValue = value?.replace("_", " ").replace("/", " or ") || "";
    return `${formattedKey}: ${formattedValue}`;
  }

  private formatAggregateValue(value: any, field?: string): string {
    if (field?.includes("Amount") || field?.includes("amount")) {
      return this.formatCurrency(Number(value) || 0);
    }
    if (field === "size") {
      return this.formatFileSize(Number(value) || 0);
    }
    return this.formatNumber(Number(value) || 0);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}