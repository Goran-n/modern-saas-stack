import { Config } from '@figgy/config';

export interface TestConfigOptions {
  core?: {
    DATABASE_URL?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_KEY?: string;
    NODE_ENV?: string;
  };
  [key: string]: any;
}

export class ConfigDouble implements Partial<Config> {
  private config: TestConfigOptions;

  constructor(overrides: TestConfigOptions = {}) {
    this.config = {
      core: {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        NODE_ENV: 'test',
        ...overrides.core,
      },
      ...overrides,
    };
  }

  getCore() {
    return this.config.core;
  }

  get(key: string) {
    return this.config[key];
  }

  getAll() {
    return this.config;
  }

  // Test-specific methods
  updateConfig(updates: TestConfigOptions): void {
    this.config = {
      ...this.config,
      ...updates,
      core: {
        ...this.config.core,
        ...updates.core,
      },
    };
  }

  reset(): void {
    this.config = {
      core: {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-service-key',
        NODE_ENV: 'test',
      },
    };
  }
}

export function createTestConfig(overrides?: TestConfigOptions): ConfigDouble {
  return new ConfigDouble(overrides);
}