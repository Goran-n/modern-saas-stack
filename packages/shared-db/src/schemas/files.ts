import {
  bigint,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const fileProcessingStatusEnum = pgEnum("file_processing_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: text("file_name").notNull(),
  pathTokens: text("path_tokens").array().notNull(), // Hierarchical path storage
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  metadata: jsonb("metadata"), // Flexible metadata storage
  source: text("source", {
    enum: ["integration", "user_upload", "whatsapp", "slack"],
  }).notNull(),
  sourceId: text("source_id"), // Reference to source entity
  tenantId: uuid("tenant_id").notNull(),
  uploadedBy: uuid("uploaded_by").notNull(),
  processingStatus:
    fileProcessingStatusEnum("processing_status").default("pending"),
  bucket: text("bucket").notNull().default("vault"),
  // Deduplication fields
  contentHash: text("content_hash"), // SHA256 hash
  fileSize: bigint("file_size", { mode: "number" }), // For validation
  // Thumbnail field
  thumbnailPath: text("thumbnail_path"), // Path to thumbnail image
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type exports
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
