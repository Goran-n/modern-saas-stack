<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-8">
          Welcome to My App
        </h1>
        
        <Card title="Getting Started" class="max-w-2xl mx-auto">
          <p class="text-gray-600 mb-6">
            This is a skeleton project built with Vue.js, Nuxt 3, tRPC, and TypeScript.
          </p>
          
          <div class="space-y-4">
            <Input
              v-model="email"
              type="email"
              label="Email"
              placeholder="Enter your email"
            />
            
            <div class="flex gap-2 justify-center">
              <Button @click="handleSubmit">
                Get Started
              </Button>
              <Button
                variant="outline"
                @click="handleLearnMore"
              >
                Learn More
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button, Card, Input } from "@my-app/ui";

const email = ref("");

function handleSubmit() {
  if (email.value) {
    console.log("Email submitted:", email.value);
    // TODO: Implement actual submission logic
  }
}

function handleLearnMore() {
  console.log("Learn more clicked");
  // TODO: Navigate to documentation or info page
}
</script>