export enum SlackCommandType {
  SWITCH_TENANT = "switch_tenant",
  LIST_TENANTS = "list_tenants",
  CURRENT_TENANT = "current_tenant",
  HELP = "help",
  QUERY = "query",
}

export interface SlackCommand {
  type: SlackCommandType;
  tenant?: string;
  query?: string;
  raw: string;
}

export class SlackCommandParser {
  // Command patterns
  private static readonly PATTERNS = {
    // Tenant switching commands
    SWITCH_LONG:
      /^(?:switch|change|use)\s+(?:tenant|org|organization)\s+(.+)$/i,
    SWITCH_SHORT: /^@(\w+)$/,
    SWITCH_INLINE: /^@(\w+)\s+(.+)$/,

    // Tenant listing commands
    LIST_LONG: /^(?:list|show)\s+(?:tenants|orgs|organizations)$/i,
    LIST_SHORT: /^@\?$/,

    // Current tenant commands
    CURRENT_LONG: /^(?:current|which|what)\s+(?:tenant|org|organization)$/i,
    CURRENT_SHORT: /^@@$/,

    // Help commands
    HELP: /^(?:help|commands|\?)$/i,
  };

  /**
   * Parse a Slack message for commands
   */
  static parse(message: string): SlackCommand {
    const trimmed = message.trim();

    // Check for inline tenant switch with query
    const inlineMatch = trimmed.match(
      SlackCommandParser.PATTERNS.SWITCH_INLINE,
    );
    if (inlineMatch?.[1] && inlineMatch[2]) {
      return {
        type: SlackCommandType.SWITCH_TENANT,
        tenant: inlineMatch[1],
        query: inlineMatch[2],
        raw: trimmed,
      };
    }

    // Check for tenant switching
    const switchLongMatch = trimmed.match(
      SlackCommandParser.PATTERNS.SWITCH_LONG,
    );
    if (switchLongMatch?.[1]) {
      return {
        type: SlackCommandType.SWITCH_TENANT,
        tenant: switchLongMatch[1].trim(),
        raw: trimmed,
      };
    }

    const switchShortMatch = trimmed.match(
      SlackCommandParser.PATTERNS.SWITCH_SHORT,
    );
    if (switchShortMatch?.[1]) {
      return {
        type: SlackCommandType.SWITCH_TENANT,
        tenant: switchShortMatch[1],
        raw: trimmed,
      };
    }

    // Check for listing tenants
    if (
      SlackCommandParser.PATTERNS.LIST_LONG.test(trimmed) ||
      SlackCommandParser.PATTERNS.LIST_SHORT.test(trimmed)
    ) {
      return {
        type: SlackCommandType.LIST_TENANTS,
        raw: trimmed,
      };
    }

    // Check for current tenant
    if (
      SlackCommandParser.PATTERNS.CURRENT_LONG.test(trimmed) ||
      SlackCommandParser.PATTERNS.CURRENT_SHORT.test(trimmed)
    ) {
      return {
        type: SlackCommandType.CURRENT_TENANT,
        raw: trimmed,
      };
    }

    // Check for help
    if (SlackCommandParser.PATTERNS.HELP.test(trimmed)) {
      return {
        type: SlackCommandType.HELP,
        raw: trimmed,
      };
    }

    // Default to query
    return {
      type: SlackCommandType.QUERY,
      query: trimmed,
      raw: trimmed,
    };
  }

  /**
   * Generate help text for Slack commands
   */
  static getHelpText(): string {
    return `*FIGGY Slack Commands*

*Tenant Management:*
• \`@acme\` - Switch to ACME tenant
• \`@acme show revenue\` - Switch tenant and run query
• \`switch tenant acme\` - Switch to ACME tenant
• \`list tenants\` or \`@?\` - Show available tenants
• \`current tenant\` or \`@@\` - Show current tenant

*Quick Commands:*
• \`help\` or \`?\` - Show this help message

*Tips:*
• In DMs, I'll remember your tenant selection
• Use @tenant prefix for quick switching
• Your queries always run in the current tenant context`;
  }

  /**
   * Format tenant list for display
   */
  static formatTenantList(
    tenants: Array<{
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
    }>,
    currentTenantId?: string,
  ): string {
    if (tenants.length === 0) {
      return "No organizations available.";
    }

    const lines = ["*Your Organizations:*\n"];

    tenants.forEach((tenant) => {
      const isCurrent = tenant.tenantId === currentTenantId;
      const marker = isCurrent ? "→" : "•";
      const current = isCurrent ? " ✓ _current_" : "";

      lines.push(
        `${marker} ${tenant.tenantName} (\`@${tenant.tenantSlug}\`)${current}`,
      );
    });

    if (tenants.length === 1) {
      lines.push("\n_This is your only available organization._");
    } else {
      lines.push("\n_Switch with_ `@slug` _or_ `switch tenant name`");
    }

    return lines.join("\n");
  }

  /**
   * Format tenant switch confirmation
   */
  static formatSwitchConfirmation(
    tenantName: string,
    tenantSlug: string,
  ): string {
    return `✓ Switched to *${tenantName}*\n_Future queries will use this organization. Switch anytime with_ \`@${tenantSlug}\``;
  }

  /**
   * Format no access error
   */
  static formatNoAccessError(attemptedTenant: string): string {
    return `❌ You don't have access to "${attemptedTenant}"\n_Use_ \`list tenants\` _to see available organizations._`;
  }

  /**
   * Format current tenant display
   */
  static formatCurrentTenant(tenantName: string, tenantSlug: string): string {
    return `You're currently using *${tenantName}* (\`@${tenantSlug}\`)`;
  }
}
