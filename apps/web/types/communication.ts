export interface WhatsAppVerification {
  id: string;
  phoneNumber: string;
  tenantId: string;
  userId: string;
  verificationCode: string;
  verified: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface SlackWorkspace {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  tenantId: string;
  botToken: string;
  botUserId: string;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  channelCount?: number;
}

export interface SlackUserMapping {
  workspaceId: string;
  slackUserId: string;
  userId: string;
  userName?: string;
  slackUserName?: string;
  createdAt: string;
}

export interface WhatsAppMapping {
  phoneNumber: string;
  tenantId: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

export interface CommunicationFile {
  id: string;
  fileName: string;
  platform: "whatsapp" | "slack";
  sender: string;
  status: "pending" | "processing" | "completed" | "failed";
  processingStartedAt?: string;
  processingCompletedAt?: string;
  error?: string;
  fileId?: string;
  jobId?: string;
}
