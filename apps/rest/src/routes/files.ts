import { getFileUrl } from "@figgy/file-manager";
import { createLogger } from "@figgy/utils";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const logger = createLogger("rest:files");
const app = new Hono();

/**
 * Generate signed URLs for multiple files
 * POST /api/files/signed-urls
 * Body: { filenames: string[], tenantId?: string }
 * Response: { [filename]: signedUrl }
 */
app.post("/signed-urls", async (c) => {
  try {
    const { filenames, tenantId } = await c.req.json();

    if (!filenames || !Array.isArray(filenames)) {
      throw new HTTPException(400, { message: "filenames array is required" });
    }

    if (!tenantId) {
      throw new HTTPException(400, { message: "tenantId is required" });
    }

    logger.info("Generating signed URLs", {
      count: filenames.length,
      tenantId,
      filenames: filenames.slice(0, 5), // Log first 5 for debugging
    });

    const signedUrls: Record<string, string> = {};
    const errors: Record<string, string> = {};

    // Generate signed URLs for each filename
    await Promise.all(
      filenames.map(async (filename: string) => {
        try {
          // For now, we'll assume filename is the fileId
          // In a real implementation, you might need to look up fileId by filename
          const signedUrl = await getFileUrl(filename, tenantId);
          signedUrls[filename] = signedUrl;
        } catch (error) {
          logger.error("Failed to generate signed URL", {
            filename,
            tenantId,
            error,
          });
          errors[filename] = error instanceof Error ? error.message : "Unknown error";
        }
      })
    );

    const response = {
      signedUrls,
      ...(Object.keys(errors).length > 0 && { errors }),
    };

    return c.json(response);
  } catch (error) {
    logger.error("Failed to process signed URLs request", { error });
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(500, {
      message: "Failed to generate signed URLs"
    });
  }
});

/**
 * Generate a single signed URL for a file
 * GET /api/files/:fileId/signed-url
 */
app.get("/:fileId/signed-url", async (c) => {
  try {
    const fileId = c.req.param("fileId");
    const tenantId = c.req.header("X-Tenant-ID");

    if (!tenantId) {
      throw new HTTPException(400, { message: "X-Tenant-ID header is required" });
    }

    logger.info("Generating single signed URL", { fileId, tenantId });

    const signedUrl = await getFileUrl(fileId, tenantId);

    return c.json({ signedUrl });
  } catch (error) {
    logger.error("Failed to generate single signed URL", { error });
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(500, {
      message: "Failed to generate signed URL"
    });
  }
});

export default app;