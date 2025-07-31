import {
  type CompanyConfig,
  companyConfigSchema,
  createDefaultCompanyConfig,
  getTenant,
  type UpdateTenantInput,
  updateTenant,
  companyBasicsSchema,
  financialConfigSchema,
  vatSetupSchema,
  documentRecognitionSchema,
  integrationsSchema,
  createValidationError,
  type OnboardingProgress,
  type ValidationError,
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
      const companyConfig = tenant.settings?.companyConfig as
        | CompanyConfig
        | undefined;

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
        const existingConfig =
          (existingSettings.companyConfig as CompanyConfig | undefined) ||
          createDefaultCompanyConfig();

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

        // Update tenant settings - only update settings, not name or status
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
        section: z.enum([
          "names",
          "identifiers",
          "addresses",
          "matching",
          "business",
          "vat",
        ]),
        data: z.record(z.string(), z.unknown()),
      }),
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
        const existingConfig =
          (existingSettings.companyConfig as CompanyConfig | undefined) ||
          createDefaultCompanyConfig();

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

        // Update tenant settings - only update settings, not name or status
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
      }),
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

  // Complete onboarding
  completeOnboarding: tenantProcedure.mutation(async ({ ctx }) => {
    const { tenantId, user } = ctx;

    logger.info("Completing onboarding", {
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

      // Update tenant metadata to mark onboarding as complete
      const updateData: UpdateTenantInput = {
        tenantId,
        name: tenant.name,
        status: tenant.status,
        settings: tenant.settings || {},
        subscription: tenant.subscription || {},
        metadata: {
          ...(tenant.metadata || {}),
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
          onboardingCompletedBy: user?.id,
        },
      };

      await updateTenant(updateData);

      logger.info("Onboarding completed successfully", {
        tenantId,
        userId: user?.id,
        requestId: ctx.requestId,
      });

      return {
        success: true,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to complete onboarding", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });

      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to complete onboarding",
      });
    }
  }),

  // Get onboarding progress
  getOnboardingProgress: tenantProcedure.query(async ({ ctx }) => {
    const { tenantId } = ctx;

    logger.info("Getting onboarding progress", {
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

      // Return onboarding progress from metadata, or default if not set
      const progress = tenant.metadata?.onboardingProgress as
        | OnboardingProgress
        | undefined;

      return (
        progress || {
          currentStep: 0,
          completedSteps: [],
          stepData: {
            basics: {},
            financial: {},
            vat: {},
            recognition: {},
            integrations: {},
          },
          lastUpdated: new Date().toISOString(),
          validationState: {},
        }
      );
    } catch (error) {
      logger.error("Failed to get onboarding progress", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });

      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get onboarding progress",
      });
    }
  }),

  // Save onboarding step data
  saveOnboardingStep: tenantProcedure
    .input(
      z.object({
        step: z.enum(["basics", "financial", "vat", "recognition", "integrations"]),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, user } = ctx;
      const { step, data } = input;

      logger.info("Saving onboarding step", {
        tenantId,
        userId: user?.id,
        step,
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

        // Get existing progress
        const existingProgress = (tenant.metadata?.onboardingProgress ||
          {
            currentStep: 0,
            completedSteps: [],
            stepData: {},
            lastUpdated: new Date().toISOString(),
            validationState: {},
          }) as OnboardingProgress;

        // Validate step data based on step type
        let validationResult;
        switch (step) {
          case "basics":
            validationResult = companyBasicsSchema.safeParse(data);
            break;
          case "financial":
            validationResult = financialConfigSchema.safeParse(data);
            break;
          case "vat":
            validationResult = vatSetupSchema.safeParse(data);
            break;
          case "recognition":
            validationResult = documentRecognitionSchema.safeParse(data);
            break;
          case "integrations":
            validationResult = integrationsSchema.safeParse(data);
            break;
        }

        if (!validationResult.success) {
          // Transform Zod errors to our custom format
          const errors: ValidationError[] = validationResult.error.issues.map(
            (issue) => {
              const field = issue.path.join(".");
              return createValidationError(
                field,
                issue.message,
                "invalid_format",
                undefined,
                "error",
              );
            },
          );

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Validation failed",
            cause: errors,
          });
        }

        // Update progress
        const updatedProgress: OnboardingProgress = {
          ...existingProgress,
          stepData: {
            ...existingProgress.stepData,
            [step]: data,
          },
          lastUpdated: new Date().toISOString(),
          validationState: {
            ...existingProgress.validationState,
            [step]: true,
          },
        };

        // Add to completed steps if not already there
        if (!updatedProgress.completedSteps.includes(step)) {
          updatedProgress.completedSteps.push(step);
        }

        // Update tenant metadata
        const updateData: UpdateTenantInput = {
          tenantId,
          name: tenant.name,
          status: tenant.status,
          settings: tenant.settings || {},
          subscription: tenant.subscription || {},
          metadata: {
            ...(tenant.metadata || {}),
            onboardingProgress: updatedProgress,
          },
        };

        await updateTenant(updateData);

        logger.info("Onboarding step saved successfully", {
          tenantId,
          userId: user?.id,
          step,
          requestId: ctx.requestId,
        });

        return updatedProgress;
      } catch (error) {
        logger.error("Failed to save onboarding step", {
          error,
          tenantId,
          step,
          requestId: ctx.requestId,
        });

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save onboarding step",
        });
      }
    }),

  // Validate onboarding step without saving
  validateOnboardingStep: tenantProcedure
    .input(
      z.object({
        step: z.enum(["basics", "financial", "vat", "recognition", "integrations"]),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { step, data } = input;

      logger.info("Validating onboarding step", {
        tenantId: ctx.tenantId,
        step,
        requestId: ctx.requestId,
      });

      try {
        // Validate step data based on step type
        let validationResult;
        let schema;
        switch (step) {
          case "basics":
            schema = companyBasicsSchema;
            validationResult = schema.safeParse(data);
            break;
          case "financial":
            schema = financialConfigSchema;
            validationResult = schema.safeParse(data);
            break;
          case "vat":
            schema = vatSetupSchema;
            validationResult = schema.safeParse(data);
            break;
          case "recognition":
            schema = documentRecognitionSchema;
            validationResult = schema.safeParse(data);
            break;
          case "integrations":
            schema = integrationsSchema;
            validationResult = schema.safeParse(data);
            break;
        }

        if (!validationResult.success) {
          // Transform Zod errors to our custom format
          const errors: ValidationError[] = validationResult.error.issues.map(
            (issue) => {
              const field = issue.path.join(".");
              let suggestion: string | undefined;

              // Add helpful suggestions based on error type
              if (issue.code === "invalid_type") {
                const typeIssue = issue as any;
                suggestion = `Expected ${typeIssue.expected}, but received ${typeIssue.received}`;
              } else if (issue.code === "too_small") {
                const sizeIssue = issue as any;
                suggestion = `Value must be at least ${sizeIssue.minimum}`;
              } else if (issue.code === "custom") {
                // Check if it's a string validation by looking at the message
                if (issue.message.includes("email")) {
                  suggestion = "Please enter a valid email address";
                } else if (issue.message.includes("URL")) {
                  suggestion = "Please enter a valid URL";
                }
              }

              return createValidationError(
                field,
                issue.message,
                "invalid_format",
                suggestion,
                "error",
              );
            },
          );

          return {
            valid: false,
            errors,
          };
        }

        // Additional quality checks for specific steps
        const warnings: ValidationError[] = [];

        if (step === "basics" && validationResult.data) {
          const basics = validationResult.data as any;
          // Warn if company name is very short
          if (basics.legalName && basics.legalName.length < 5) {
            warnings.push(
              createValidationError(
                "legalName",
                "Company name seems very short",
                "data_quality",
                "Consider using your full legal company name",
                "warning",
              ),
            );
          }
        }

        if (step === "recognition" && validationResult.data) {
          const recognition = validationResult.data as any;
          // Suggest adding email domains if none provided
          if (!recognition.emailDomains || recognition.emailDomains.length === 0) {
            warnings.push(
              createValidationError(
                "emailDomains",
                "No email domains provided",
                "data_quality",
                "Adding your company email domains helps with document recognition",
                "info",
              ),
            );
          }
        }

        return {
          valid: true,
          errors: [],
          warnings,
        };
      } catch (error) {
        logger.error("Failed to validate onboarding step", {
          error,
          tenantId: ctx.tenantId,
          step,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate onboarding step",
        });
      }
    }),

  // Reset onboarding progress
  resetOnboardingProgress: tenantProcedure.mutation(async ({ ctx }) => {
    const { tenantId, user } = ctx;

    logger.info("Resetting onboarding progress", {
      tenantId,
      userId: user?.id,
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

      // Remove onboarding progress from metadata
      const { onboardingProgress, onboardingCompleted, ...restMetadata } =
        tenant.metadata || {};

      const updateData: UpdateTenantInput = {
        tenantId,
        name: tenant.name,
        status: tenant.status,
        settings: tenant.settings || {},
        subscription: tenant.subscription || {},
        metadata: restMetadata,
      };

      await updateTenant(updateData);

      logger.info("Onboarding progress reset successfully", {
        tenantId,
        userId: user?.id,
        requestId: ctx.requestId,
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to reset onboarding progress", {
        error,
        tenantId,
        requestId: ctx.requestId,
      });

      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reset onboarding progress",
      });
    }
  }),
});
