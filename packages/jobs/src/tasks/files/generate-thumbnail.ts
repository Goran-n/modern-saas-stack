import { getConfig } from "@figgy/config";
import {
  eq,
  files as filesTable,
  getDatabaseConnection,
} from "@figgy/shared-db";
import { SupabaseStorageClient } from "@figgy/supabase-storage";
import { logger } from "@figgy/utils";
import { schemaTask } from "@trigger.dev/sdk/v3";
import sharp from "sharp";
import { z } from "zod";

const generateThumbnailSchema = z.object({
  fileId: z.string(),
  tenantId: z.string(),
  mimeType: z.string(),
});

export const generateThumbnail = schemaTask({
  id: "generate-thumbnail",
  schema: generateThumbnailSchema,
  maxDuration: 30,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 5000,
  },
  run: async ({ fileId, tenantId, mimeType }) => {
    // Only process PDFs for now
    if (mimeType !== "application/pdf") {
      logger.info("Skipping non-PDF file for thumbnail generation", {
        fileId,
        mimeType,
      });
      return { status: "skipped", reason: "not_pdf" };
    }

    const configManager = getConfig();
    configManager.validate();
    const config = configManager.getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);

    try {
      logger.info("Starting thumbnail generation", { fileId, tenantId });

      // Fetch file details
      const [file] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, fileId))
        .limit(1);

      if (!file) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Verify tenant ownership
      if (file.tenantId !== tenantId) {
        logger.error("Tenant mismatch", {
          fileId,
          fileTenantId: file.tenantId,
          requestTenantId: tenantId,
        });
        throw new Error("Unauthorized: File does not belong to requesting tenant");
      }

      // Skip if thumbnail already exists
      if (file.thumbnailPath) {
        logger.info("Thumbnail already exists", {
          fileId,
          thumbnailPath: file.thumbnailPath,
        });
        return { status: "already_exists" };
      }

      // Get signed URL for the PDF
      const storage = new SupabaseStorageClient({
        url: config.SUPABASE_URL,
        serviceRoleKey: config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
        bucket: file.bucket,
      });

      const { data: signedUrl, error: urlError } = await storage.signedUrl(
        file.pathTokens.join("/"),
        300, // 5 minutes expiry
      );

      if (urlError || !signedUrl) {
        throw new Error(`Failed to generate signed URL: ${urlError}`);
      }

      // Generate thumbnail path
      const thumbnailFileName = `${file.id}_thumb.webp`;
      const thumbnailPath = `${file.tenantId}/thumbnails/${thumbnailFileName}`;
      
      // Check if PDF.co API key is configured
      const pdfCoApiKey = config.PDF_CO_API_KEY;
      
      if (!pdfCoApiKey) {
        logger.warn("PDF_CO_API_KEY not configured, using placeholder thumbnail", { fileId });
        
        // Create a simple placeholder
        const placeholderBuffer = await sharp({
          create: {
            width: 300,
            height: 424,
            channels: 4,
            background: { r: 240, g: 240, b: 240, alpha: 1 },
          },
        })
          .webp({ quality: 80 })
          .toBuffer();
          
        const { error: uploadError } = await storage.uploadBuffer(
          thumbnailPath,
          placeholderBuffer,
          { contentType: "image/webp" }
        );

        if (uploadError) {
          throw new Error(`Failed to upload placeholder: ${uploadError.message}`);
        }
      } else {
        // Use PDF.co API to convert PDF to WebP
        logger.info("Converting PDF to WebP using PDF.co", { fileId });
        
        try {
          const pdfCoResponse = await fetch("https://api.pdf.co/v1/pdf/convert/to/webp", {
            method: "POST",
            headers: {
              "x-api-key": pdfCoApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: signedUrl.signedUrl,
              inline: true,
              pages: "0", // First page only
              async: false,
            }),
          });

          if (!pdfCoResponse.ok) {
            const errorText = await pdfCoResponse.text();
            throw new Error(`PDF.co API error (${pdfCoResponse.status}): ${errorText}`);
          }

          const pdfCoResult = await pdfCoResponse.json();
          
          if (pdfCoResult.error) {
            throw new Error(`PDF.co conversion failed: ${pdfCoResult.message || 'Unknown error'}`);
          }

          if (!pdfCoResult.urls || pdfCoResult.urls.length === 0) {
            throw new Error("PDF.co returned no image URLs");
          }

          // Download the generated WebP image
          const webpUrl = pdfCoResult.urls[0];
          const webpResponse = await fetch(webpUrl);
          
          if (!webpResponse.ok) {
            throw new Error(`Failed to download WebP from PDF.co: ${webpResponse.statusText}`);
          }

          const webpBuffer = Buffer.from(await webpResponse.arrayBuffer());

          // Resize to ensure consistent dimensions (300x424, A4 aspect ratio)
          const thumbnailBuffer = await sharp(webpBuffer)
            .resize(300, 424, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .webp({ quality: 80 })
            .toBuffer();

          // Upload thumbnail to storage
          logger.info("Uploading thumbnail", { fileId, thumbnailPath });
          const { error: uploadError } = await storage.uploadBuffer(
            thumbnailPath,
            thumbnailBuffer,
            { contentType: "image/webp" }
          );

          if (uploadError) {
            throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
          }
        } catch (pdfCoError) {
          logger.error("PDF.co conversion failed, using placeholder", {
            fileId,
            error: pdfCoError instanceof Error ? pdfCoError.message : String(pdfCoError),
          });
          
          // Fall back to placeholder on any PDF.co error
          const placeholderBuffer = await sharp({
            create: {
              width: 300,
              height: 424,
              channels: 4,
              background: { r: 240, g: 240, b: 240, alpha: 1 },
            },
          })
            .webp({ quality: 80 })
            .toBuffer();
            
          const { error: uploadError } = await storage.uploadBuffer(
            thumbnailPath,
            placeholderBuffer,
            { contentType: "image/webp" }
          );

          if (uploadError) {
            throw new Error(`Failed to upload placeholder: ${uploadError.message}`);
          }
        }
      }

      // Update file record with thumbnail path
      await db
        .update(filesTable)
        .set({
          thumbnailPath: thumbnailPath,
          updatedAt: new Date(),
        })
        .where(eq(filesTable.id, fileId));

      logger.info("Thumbnail generated successfully", {
        fileId,
        thumbnailPath,
      });

      return {
        status: "success",
        thumbnailPath,
      };
    } catch (error) {
      logger.error("Thumbnail generation failed", {
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Don't throw - this is a non-critical operation
      return {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});