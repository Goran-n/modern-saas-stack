import { defineStore } from "pinia";
import type {
  SlackWorkspace,
  WhatsAppVerification,
} from "@/types/communication";

interface CommunicationStats {
  totalMessages: number;
  whatsappMessages: number;
  slackMessages: number;
  filesProcessedToday: number;
  failedProcessing: number;
  pendingVerifications: number;
}

interface RecentActivity {
  id: string;
  platform: "whatsapp" | "slack";
  type: "message" | "file" | "verification";
  description: string;
  status: "success" | "pending" | "failed";
  timestamp: string;
  metadata?: Record<string, any>;
}

export const useCommunicationStore = defineStore("communication", {
  state: () => ({
    stats: {
      totalMessages: 0,
      whatsappMessages: 0,
      slackMessages: 0,
      filesProcessedToday: 0,
      failedProcessing: 0,
      pendingVerifications: 0,
    } as CommunicationStats,
    recentActivity: [] as RecentActivity[],
    verifications: [] as WhatsAppVerification[],
    workspaces: [] as SlackWorkspace[],
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    pendingVerifications: (state) =>
      state.verifications.filter(
        (v) => !v.verified && new Date(v.expiresAt) > new Date(),
      ),

    expiredVerifications: (state) =>
      state.verifications.filter(
        (v) => !v.verified && new Date(v.expiresAt) <= new Date(),
      ),

    activeWorkspaces: (state) => state.workspaces.filter((w) => w.botToken),

    failedActivities: (state) =>
      state.recentActivity.filter((a) => a.status === "failed"),
  },

  actions: {
    async fetchStats() {
      this.isLoading = true;
      this.error = null;

      try {
        const api = useApi();
        const response = await api.get<{
          result: { data: { json: CommunicationStats } };
        }>("/trpc/communication.getStats");
        this.stats = response.result.data.json;
      } catch (error) {
        console.error("Failed to fetch communication stats:", error);
        this.error = "Failed to load statistics";
      } finally {
        this.isLoading = false;
      }
    },

    async fetchRecentActivity() {
      try {
        const api = useApi();
        const response = await api.get<{
          result: { data: { json: RecentActivity[] } };
        }>("/trpc/communication.getRecentActivity");
        this.recentActivity = response.result.data.json;
      } catch (error) {
        console.error("Failed to fetch recent activity:", error);
      }
    },

    async fetchVerifications() {
      try {
        const api = useApi();
        const response = await api.get<{
          result: { data: { json: WhatsAppVerification[] } };
        }>("/trpc/communication.getVerifications");
        this.verifications = response.result.data.json;
      } catch (error) {
        console.error("Failed to fetch verifications:", error);
        throw error;
      }
    },

    async updateVerification(id: string, verified: boolean) {
      try {
        const api = useApi();
        await api.post("/trpc/communication.updateVerification", {
          json: { id, verified },
        });

        // Update local state
        const verification = this.verifications.find((v) => v.id === id);
        if (verification) {
          verification.verified = verified;
        }
      } catch (error) {
        console.error("Failed to update verification:", error);
        throw error;
      }
    },

    async fetchWorkspaces() {
      try {
        const api = useApi();
        const response = await api.get<{
          result: { data: { json: SlackWorkspace[] } };
        }>("/trpc/communication.getWorkspaces");
        this.workspaces = response.result.data.json;
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        throw error;
      }
    },

    async retryFailedProcessing(activityId: string) {
      try {
        const api = useApi();
        await api.post("/trpc/communication.retryProcessing", {
          json: { activityId },
        });

        // Update activity status
        const activity = this.recentActivity.find((a) => a.id === activityId);
        if (activity) {
          activity.status = "pending";
        }
      } catch (error) {
        console.error("Failed to retry processing:", error);
        throw error;
      }
    },

    addActivity(activity: Omit<RecentActivity, "id" | "timestamp">) {
      this.recentActivity.unshift({
        ...activity,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });

      // Keep only last 50 activities
      if (this.recentActivity.length > 50) {
        this.recentActivity = this.recentActivity.slice(0, 50);
      }
    },
  },
});
