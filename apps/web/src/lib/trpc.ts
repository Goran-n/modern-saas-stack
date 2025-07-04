// Re-export the reactive tRPC client for backward compatibility
export { 
  trpc, 
  updateTRPCTenantContext, 
  updateTRPCAuthContext, 
  resetTRPCContext,
  handleTRPCError,
  safeTRPCQuery,
  safeTRPCMutation 
} from './trpc-reactive'