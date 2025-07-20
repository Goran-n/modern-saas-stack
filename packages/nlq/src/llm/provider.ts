import type { LLMProvider, QueryContext, ParsedQuery, SummaryRequest } from "../types";

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;

  abstract parseQuery(
    query: string,
    context?: QueryContext,
  ): Promise<ParsedQuery>;

  abstract generateSummary(
    data: SummaryRequest,
  ): Promise<string>;

  abstract generateFollowUp(
    query: ParsedQuery,
    results: any[],
  ): Promise<string[]>;

  protected getCurrentDate(timezone?: string): string {
    const date = new Date();
    if (timezone) {
      return date.toLocaleDateString("en-US", { timeZone: timezone });
    }
    return date.toISOString().split("T")[0] || date.toISOString();
  }

  protected resolveRelativeDate(
    dateStr: string,
    timezone?: string,
  ): { start: string; end: string } {
    const today = new Date();
    if (timezone) {
      // Handle timezone if provided
      today.setHours(0, 0, 0, 0);
    }

    const dateMap: Record<string, () => { start: Date; end: Date }> = {
      today: () => ({
        start: new Date(today),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      }),
      yesterday: () => {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday,
          end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
        };
      },
      "this week": () => {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end: endOfWeek };
      },
      "last week": () => {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        endOfLastWeek.setHours(23, 59, 59, 999);
        return { start: startOfLastWeek, end: endOfLastWeek };
      },
      "this month": () => {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return { start: startOfMonth, end: endOfMonth };
      },
      "last month": () => {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        endOfLastMonth.setHours(23, 59, 59, 999);
        return { start: startOfLastMonth, end: endOfLastMonth };
      },
    };

    const resolver = dateMap[dateStr.toLowerCase()];
    if (resolver) {
      const { start, end } = resolver();
      return {
        start: start.toISOString(),
        end: end.toISOString(),
      };
    }

    // If not a relative date, assume it's today
    return {
      start: today.toISOString(),
      end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
    };
  }
}