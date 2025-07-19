// Test script to identify the duplicates router issue
import { DeduplicationService } from '@kibly/deduplication';

console.log('Testing DeduplicationService import...');

try {
  const service = new DeduplicationService();
  console.log('✅ DeduplicationService created successfully');
} catch (error) {
  console.error('❌ DeduplicationService creation failed:', error);
}

console.log('Test complete');