import { 
  getTenant, 
  updateTenant, 
  type UpdateTenantInput,
  type CompanyConfig,
  companyConfigSchema,
  createDefaultCompanyConfig,
} from "@figgy/tenant";
import { createLogger } from "@figgy/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

const logger = createLogger("tenant-router");

export const tenantRouter = createTRPCRouter({
  // Get current tenant details
  get: tenantProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    logger.info("Getting tenant details", {
      tenantId,
      requestId: ctx.requestId,
    });

    try {
      const tenant = await getTenant(tenantId);
      
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      return tenant;
    } catch (error) {
      logger.error("Failed to get tenant", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });

      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get tenant details",
      });
    }
  }),

  // Get company configuration
  getCompanyConfig: tenantProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    logger.info("Getting company configuration", {
      tenantId,
      requestId: ctx.requestId,
    });

    try {
      const tenant = await getTenant(tenantId);
      
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      // Return company config from settings, or default if not set
      const companyConfig = tenant.settings?.companyConfig as CompanyConfig | undefined;
      
      return companyConfig || createDefaultCompanyConfig();
    } catch (error) {
      logger.error("Failed to get company configuration", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });

      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get company configuration",
      });
    }
  }),

  // Update company configuration
  updateCompanyConfig: tenantProcedure
    .input(companyConfigSchema.partial())
    .mutation(async ({ ctx, input }) => {
      const { tenantId, user } = ctx;

      logger.info("Updating company configuration", {
        tenantId,
        userId: user?.id,
        requestId: ctx.requestId,
      });

      try {
        // Get current tenant
        const tenant = await getTenant(tenantId);
        
        if (!tenant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tenant not found",
          });
        }

        // Get existing settings
        const existingSettings = tenant.settings || {};
        const existingConfig = existingSettings.companyConfig as CompanyConfig | undefined || createDefaultCompanyConfig();

        // Deep merge the configuration
        const updatedConfig: CompanyConfig = {
          names: {
            ...existingConfig.names,
            ...(input.names || {}),
          },
          identifiers: {
            ...existingConfig.identifiers,
            ...(input.identifiers || {}),
          },
          addresses: {
            ...existingConfig.addresses,
            ...(input.addresses || {}),
          },
          matching: {
            ...existingConfig.matching,
            ...(input.matching || {}),
          },
          business: {
            ...existingConfig.business,
            ...(input.business || {}),
          },
          vat: {
            ...existingConfig.vat,
            ...(input.vat || {}),
          },
        };

        // Update tenant settings
        const updateData: UpdateTenantInput = {
          tenantId,
          settings: {
            ...existingSettings,
            companyConfig: updatedConfig,
          },
        };

        await updateTenant(updateData);

        logger.info("Company configuration updated successfully", {
          tenantId,
          userId: user?.id,
          requestId: ctx.requestId,
        });

        return updatedConfig;
      } catch (error) {
        logger.error("Failed to update company configuration", {
          error,
          tenantId,
          requestId: ctx.requestId,
        });

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update company configuration",
        });
      }
    }),

  // Update a specific section of company configuration
  updateCompanyConfigSection: tenantProcedure
    .input(
      z.object({
        section: z.enum(["names", "identifiers", "addresses", "matching", "business", "vat"]),
        data: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, user } = ctx;
      const { section, data } = input;

      logger.info("Updating company configuration section", {
        tenantId,
        userId: user?.id,
        section,
        requestId: ctx.requestId,
      });

      try {
        // Get current tenant
        const tenant = await getTenant(tenantId);
        
        if (!tenant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tenant not found",
          });
        }

        // Get existing settings
        const existingSettings = tenant.settings || {};
        const existingConfig = existingSettings.companyConfig as CompanyConfig | undefined || createDefaultCompanyConfig();

        // Update specific section
        const updatedConfig: CompanyConfig = {
          ...existingConfig,
          [section]: {
            ...existingConfig[section],
            ...data,
          },
        };

        // Validate the updated configuration
        const validationResult = companyConfigSchema.safeParse(updatedConfig);
        
        if (!validationResult.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid company configuration",
            cause: validationResult.error.flatten(),
          });
        }

        // Update tenant settings
        const updateData: UpdateTenantInput = {
          tenantId,
          settings: {
            ...existingSettings,
            companyConfig: updatedConfig,
          },
        };

        await updateTenant(updateData);

        logger.info("Company configuration section updated successfully", {
          tenantId,
          userId: user?.id,
          section,
          requestId: ctx.requestId,
        });

        return updatedConfig;
      } catch (error) {
        logger.error("Failed to update company configuration section", {
          error,
          tenantId,
          section,
          requestId: ctx.requestId,
        });

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update company configuration section",
        });
      }
    }),

  // Validate VAT number
  validateVATNumber: tenantProcedure
    .input(
      z.object({
        vatNumber: z.string(),
        country: z.string().length(2),
      })
    )
    .query(async ({ ctx, input }) => {
      const { vatNumber, country } = input;

      logger.info("Validating VAT number", {
        tenantId: ctx.tenantId,
        country,
        requestId: ctx.requestId,
      });

      try {
        // Import the validation function
        const { validateVATNumber } = await import("@figgy/tenant");
        
        const isValid = validateVATNumber(vatNumber, country);
        
        return {
          valid: isValid,
          vatNumber,
          country,
        };
      } catch (error) {
        logger.error("Failed to validate VAT number", {
          error,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate VAT number",
        });
      }
    }),
});