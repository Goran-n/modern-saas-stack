#!/usr/bin/env node

/**
 * Test script to simulate concurrent Slack webhook requests 
 * and verify that the "Message already processed" issue is fixed
 */

const messagePayload = {
  messageId: `test-message-${Date.now()}`,
  platform: "slack",
  sender: "test-user",
  content: "Test message for duplicate handling",
  tenantId: "test-tenant-id",
  userId: "test-user-id"
};

// Simulate multiple concurrent requests with the same messageId
const simulateConcurrentRequests = async () => {
  console.log("🧪 Testing concurrent message processing...");
  console.log(`Message ID: ${messagePayload.messageId}`);
  
  // Import the storeMessage function
  const { storeMessage } = await import('./packages/communication/dist/operations/query.js');
  
  // Create multiple promises with the same messageId (simulating race condition)
  const promises = Array(3).fill().map((_, i) => {
    return storeMessage(messagePayload)
      .then(id => {
        console.log(`✅ Request ${i + 1}: Successfully stored/retrieved message with ID: ${id}`);
        return { success: true, requestNumber: i + 1, messageId: id };
      })
      .catch(error => {
        console.error(`❌ Request ${i + 1}: Failed:`, error.message);
        return { success: false, requestNumber: i + 1, error: error.message };
      });
  });
  
  // Execute all requests concurrently
  const results = await Promise.allSettled(promises);
  
  console.log("\n📊 Results:");
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        console.log(`Request ${i + 1}: ✅ Success (Message ID: ${data.messageId})`);
      } else {
        console.log(`Request ${i + 1}: ❌ Failed - ${data.error}`);
      }
    } else {
      console.log(`Request ${i + 1}: ❌ Rejected - ${result.reason}`);
    }
  });
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  console.log(`\n🎯 Summary: ${successful.length}/${results.length} requests succeeded`);
  
  if (successful.length === 3) {
    console.log("✅ SUCCESS: All concurrent requests handled properly!");
    console.log("🎉 The 'Message already processed' issue should be fixed!");
  } else {
    console.log("⚠️  Some requests failed - might need further investigation");
  }
};

// Run the test
simulateConcurrentRequests().catch(console.error);
