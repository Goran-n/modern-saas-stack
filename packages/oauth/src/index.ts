// OAuth provider exports
export {
  OAuthProvider,
} from "./providers/base";
export {
  GoogleOAuthProvider,
  GmailOAuthProvider,
} from "./providers/google";
export {
  MicrosoftOAuthProvider,
  OutlookOAuthProvider,
} from "./providers/microsoft";
export { SlackOAuthProvider } from "./providers/slack";
export { HmrcOAuthProvider } from "./providers/hmrc";
export {
  OAuthProviderRegistry,
  getOAuthProviderRegistry,
} from "./providers/registry";

// OAuth service exports
export {
  OAuthEncryptionService,
  getOAuthEncryptionService,
  OAuthTokenManager,
  getOAuthTokenManager,
  OAuthCronService,
  getOAuthCronService,
} from "./services";

// Type exports
export type { OAuthTokens, OAuthProviderConfig } from "./types";