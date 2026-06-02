import { LogtoNextConfig, UserScope } from '@logto/next';

export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT ?? '',
  appId: process.env.LOGTO_APP_ID ?? '',
  appSecret: process.env.LOGTO_APP_SECRET ?? '',
  baseUrl: process.env.LOGTO_BASE_URL ?? '',
  cookieSecret: process.env.LOGTO_COOKIE_SECRET ?? '',
  cookieSecure: process.env.NODE_ENV === 'production',
  scopes: [UserScope.Email, UserScope.Profile],
};

// True only when the core Logto credentials are present. When false, the app runs
// fully anonymous (today-only, localStorage) and never calls the Logto SDK.
export const isLogtoConfigured = Boolean(
  process.env.LOGTO_ENDPOINT &&
    process.env.LOGTO_APP_ID &&
    process.env.LOGTO_APP_SECRET &&
    process.env.LOGTO_BASE_URL,
);
