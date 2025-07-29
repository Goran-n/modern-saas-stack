import type { Ref } from "vue";
import { ref } from "vue";

export interface SlackTokenInfo {
  valid: boolean;
  slackUserId?: string;
  slackEmail?: string;
  slackTeamId?: string;
  slackTeamName?: string;
}

export interface SlackTenant {
  id: string;
  name: string;
  role: string;
}

export interface UseSlackAuthReturn {
  loading: Ref<boolean>;
  linking: Ref<boolean>;
  error: Ref<string>;
  tokenInfo: Ref<SlackTokenInfo | null>;
  verifySlackToken: (token: string) => Promise<boolean>;
  linkSlackAccount: (token: string, tenantIds: string[]) => Promise<boolean>;
  openSlackApp: () => void;
}

export const useSlackAuth = (): UseSlackAuthReturn => {
  const api = useApi();
  const { general, communication } = useNotifications();

  const loading = ref(false);
  const linking = ref(false);
  const error = ref("");
  const tokenInfo = ref<SlackTokenInfo | null>(null);

  const verifySlackToken = async (token: string): Promise<boolean> => {
    loading.value = true;
    error.value = "";

    try {
      const response = await api.post(
        "/trpc/communication.verifySlackLinkingToken",
        {
          json: { token },
        },
      );

      const result = (response as any).result?.data?.json;

      if (!result?.valid) {
        error.value =
          "This link has expired or is invalid. Please return to Slack and request a new link.";
        return false;
      }

      tokenInfo.value = result;
      return true;
    } catch (err) {
      error.value =
        "An error occurred while verifying your link. Please try again.";
      general.error(
        "Verification Failed",
        err instanceof Error ? err.message : "Unknown error",
      );
      return false;
    } finally {
      loading.value = false;
    }
  };

  const linkSlackAccount = async (
    token: string,
    tenantIds: string[],
  ): Promise<boolean> => {
    if (tenantIds.length === 0) {
      error.value = "Please select at least one organisation";
      return false;
    }

    linking.value = true;
    error.value = "";

    try {
      const response = await api.post("/trpc/communication.linkSlackAccount", {
        json: {
          token,
          tenantIds,
        },
      });

      const result = (response as any).result?.data?.json;

      if (!result?.success) {
        error.value = result?.error || "Failed to link account";
        communication.slackLinkFailed(error.value);
        return false;
      }

      communication.slackLinked();
      return true;
    } catch (err) {
      error.value =
        "An error occurred while linking your account. Please try again.";
      general.error(
        "Linking Failed",
        err instanceof Error ? err.message : "Unknown error",
      );
      return false;
    } finally {
      linking.value = false;
    }
  };

  const openSlackApp = () => {
    // Try to open Slack desktop app
    window.location.href = "slack://open";

    // Fallback to web app after a delay
    setTimeout(() => {
      window.open("https://app.slack.com", "_blank");
    }, 1000);
  };

  return {
    loading,
    linking,
    error,
    tokenInfo,
    verifySlackToken,
    linkSlackAccount,
    openSlackApp,
  };
};
