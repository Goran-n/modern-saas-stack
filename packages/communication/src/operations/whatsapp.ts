import {
  and,
  desc,
  eq,
  whatsappMappings,
  whatsappVerifications,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { getDb } from "../db";
import { getTwilioService } from "../services/twilio";

const logger = createLogger("whatsapp-operations");

/**
 * Get all WhatsApp verifications for a tenant
 * @param tenantId - Tenant ID
 * @returns Promise resolving to array of verifications
 */
export async function getWhatsAppVerifications(tenantId: string) {
  logger.info("Getting WhatsApp verifications", { tenantId });

  const db = getDb();

  try {
    const verifications = await db
      .select()
      .from(whatsappVerifications)
      .where(eq(whatsappVerifications.tenantId, tenantId))
      .orderBy(desc(whatsappVerifications.createdAt));

    return verifications;
  } catch (error) {
    logger.error("Failed to get verifications", { error, tenantId });
    throw new Error("Failed to get verifications");
  }
}

/**
 * Update WhatsApp verification status
 * @param id - Verification ID
 * @param tenantId - Tenant ID for security check
 * @param verified - Whether verification is complete
 * @returns Promise resolving to success status
 */
export async function updateWhatsAppVerification(
  id: string,
  tenantId: string,
  verified: boolean,
): Promise<{ success: boolean }> {
  logger.info("Updating WhatsApp verification", { id, tenantId, verified });

  const db = getDb();

  try {
    // Get verification to ensure it belongs to tenant
    const verification = await db
      .select()
      .from(whatsappVerifications)
      .where(
        and(
          eq(whatsappVerifications.id, id),
          eq(whatsappVerifications.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!verification[0]) {
      throw new Error("Verification not found");
    }

    // Update verification status
    await db
      .update(whatsappVerifications)
      .set({ verified })
      .where(eq(whatsappVerifications.id, id));

    // If verified, create mapping
    if (verified) {
      await db
        .insert(whatsappMappings)
        .values({
          phoneNumber: verification[0].phoneNumber,
          tenantId: verification[0].tenantId,
          userId: verification[0].userId,
        })
        .onConflictDoUpdate({
          target: whatsappMappings.phoneNumber,
          set: {
            userId: verification[0].userId,
            tenantId: verification[0].tenantId,
          },
        });
    }

    logger.info("Verification updated successfully", { id, verified });

    return { success: true };
  } catch (error) {
    logger.error("Failed to update verification", { error, id });
    throw new Error(
      error instanceof Error ? error.message : "Failed to update verification",
    );
  }
}

/**
 * Create a new WhatsApp verification
 * @param phoneNumber - Phone number to verify
 * @param tenantId - Tenant ID
 * @param userId - User ID to associate with
 * @returns Promise resolving to verification details
 */
export async function createWhatsAppVerification(
  phoneNumber: string,
  tenantId: string,
  userId: string,
): Promise<{
  success: boolean;
  verificationId: string;
  message: string;
}> {
  logger.info("Creating WhatsApp verification", {
    phoneNumber,
    tenantId,
    userId,
  });

  const db = getDb();

  try {
    // Check if verification already exists for this phone number
    const existing = await db
      .select()
      .from(whatsappVerifications)
      .where(
        and(
          eq(whatsappVerifications.phoneNumber, phoneNumber),
          eq(whatsappVerifications.tenantId, tenantId),
          eq(whatsappVerifications.verified, false),
        ),
      )
      .limit(1);

    if (existing[0] && new Date(existing[0].expiresAt) > new Date()) {
      throw new Error("A verification already exists for this phone number");
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // Set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Create the verification record
    const [verification] = await db
      .insert(whatsappVerifications)
      .values({
        phoneNumber,
        tenantId,
        userId,
        verificationCode,
        expiresAt,
        verified: false,
      })
      .returning();

    // Send verification code via WhatsApp
    try {
      const twilioService = getTwilioService();
      const messageSid = await twilioService.sendVerificationCode(
        phoneNumber,
        verificationCode,
      );

      logger.info("WhatsApp verification code sent", {
        phoneNumber,
        messageSid,
        verificationId: verification?.id,
      });
    } catch (twilioError) {
      logger.error("Failed to send WhatsApp verification code", {
        error: twilioError,
        phoneNumber,
        verificationId: verification?.id,
      });

      // Delete the verification record since we couldn't send the code
      if (verification?.id) {
        await db
          .delete(whatsappVerifications)
          .where(eq(whatsappVerifications.id, verification.id));
      }

      throw new Error("Failed to send verification code. Please try again.");
    }

    return {
      success: true,
      verificationId: verification?.id || "",
      message: "Verification code has been sent to the phone number",
    };
  } catch (error) {
    logger.error("Failed to create verification", { error, phoneNumber });
    throw new Error(
      error instanceof Error ? error.message : "Failed to create verification",
    );
  }
}

/**
 * Verify a WhatsApp verification code
 * @param phoneNumber - Phone number
 * @param code - Verification code
 * @param tenantId - Tenant ID
 * @returns Promise resolving to verification result
 */
export async function verifyWhatsAppCode(
  phoneNumber: string,
  code: string,
  tenantId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  logger.info("Verifying WhatsApp code", { phoneNumber, tenantId });

  const db = getDb();

  try {
    // Find the verification record
    const verification = await db
      .select()
      .from(whatsappVerifications)
      .where(
        and(
          eq(whatsappVerifications.phoneNumber, phoneNumber),
          eq(whatsappVerifications.tenantId, tenantId),
          eq(whatsappVerifications.verified, false),
        ),
      )
      .limit(1);

    if (!verification[0]) {
      throw new Error("No pending verification found for this phone number");
    }

    // Check if verification has expired
    if (new Date(verification[0].expiresAt) < new Date()) {
      throw new Error("Verification code has expired");
    }

    // Check if the code matches
    if (verification[0].verificationCode !== code) {
      throw new Error("Invalid verification code");
    }

    // Update verification to verified
    await db
      .update(whatsappVerifications)
      .set({
        verified: true,
      })
      .where(eq(whatsappVerifications.id, verification[0].id));

    // Create the mapping
    await db
      .insert(whatsappMappings)
      .values({
        phoneNumber,
        tenantId,
        userId: verification[0].userId,
      })
      .onConflictDoUpdate({
        target: whatsappMappings.phoneNumber,
        set: {
          userId: verification[0].userId,
          tenantId,
        },
      });

    logger.info("Phone number verified successfully", {
      phoneNumber,
      userId: verification[0].userId,
      verificationId: verification[0].id,
    });

    return {
      success: true,
      message: "Phone number verified successfully",
    };
  } catch (error) {
    logger.error("Failed to verify code", { error, phoneNumber });
    throw new Error(
      error instanceof Error ? error.message : "Failed to verify code",
    );
  }
}
