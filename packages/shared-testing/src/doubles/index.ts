// Import the factory functions first
import { ConfigDouble, createTestConfig, type TestConfigOptions } from './config.double';
import { StorageDouble, createTestStorage, type StorageFile } from './storage.double';
import { 
  ExtractorDouble, 
  createTestExtractor, 
  ExtractionPresets,
  type ExtractionResult 
} from './extractor.double';

// Re-export everything
export { ConfigDouble, createTestConfig, type TestConfigOptions } from './config.double';
export { StorageDouble, createTestStorage, type StorageFile } from './storage.double';
export { 
  ExtractorDouble, 
  createTestExtractor, 
  ExtractionPresets,
  type ExtractionResult 
} from './extractor.double';

// Convenience factory for creating all doubles at once
export interface TestDoubles {
  config: ConfigDouble;
  storage: StorageDouble;
  extractor: ExtractorDouble;
}

export function createTestDoubles(
  configOverrides?: TestConfigOptions
): TestDoubles {
  return {
    config: createTestConfig(configOverrides),
    storage: createTestStorage(),
    extractor: createTestExtractor(),
  };
}