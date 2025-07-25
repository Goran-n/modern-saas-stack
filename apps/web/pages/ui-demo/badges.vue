<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Badge Components Demo</h1>
      
      <!-- Basic Badges -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Basic Badges</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-700 mb-3">Solid Variant</h3>
          <div class="flex flex-wrap gap-3 mb-6">
            <FigBadge color="primary">Primary</FigBadge>
            <FigBadge color="secondary">Secondary</FigBadge>
            <FigBadge color="success">Success</FigBadge>
            <FigBadge color="warning">Warning</FigBadge>
            <FigBadge color="error">Error</FigBadge>
            <FigBadge color="info">Info</FigBadge>
            <FigBadge color="neutral">Neutral</FigBadge>
          </div>
          
          <h3 class="text-lg font-medium text-gray-700 mb-3">Soft Variant</h3>
          <div class="flex flex-wrap gap-3 mb-6">
            <FigBadge variant="soft" color="primary">Primary</FigBadge>
            <FigBadge variant="soft" color="secondary">Secondary</FigBadge>
            <FigBadge variant="soft" color="success">Success</FigBadge>
            <FigBadge variant="soft" color="warning">Warning</FigBadge>
            <FigBadge variant="soft" color="error">Error</FigBadge>
            <FigBadge variant="soft" color="info">Info</FigBadge>
            <FigBadge variant="soft" color="neutral">Neutral</FigBadge>
          </div>
          
          <h3 class="text-lg font-medium text-gray-700 mb-3">Outline Variant</h3>
          <div class="flex flex-wrap gap-3">
            <FigBadge variant="outline" color="primary">Primary</FigBadge>
            <FigBadge variant="outline" color="secondary">Secondary</FigBadge>
            <FigBadge variant="outline" color="success">Success</FigBadge>
            <FigBadge variant="outline" color="warning">Warning</FigBadge>
            <FigBadge variant="outline" color="error">Error</FigBadge>
            <FigBadge variant="outline" color="info">Info</FigBadge>
            <FigBadge variant="outline" color="neutral">Neutral</FigBadge>
          </div>
        </div>
      </section>
      
      <!-- Status Badges -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Status Badges (with automatic icons)</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-700 mb-3">Processing Statuses</h3>
          <div class="flex flex-wrap gap-3 mb-6">
            <FigStatusBadge status="pending" />
            <FigStatusBadge status="in_progress" />
            <FigStatusBadge status="processing" />
            <FigStatusBadge status="submitted" />
            <FigStatusBadge status="in_review" />
            <FigStatusBadge status="completed" />
            <FigStatusBadge status="failed" />
          </div>
          
          <h3 class="text-lg font-medium text-gray-700 mb-3">Verification Statuses</h3>
          <div class="flex flex-wrap gap-3 mb-6">
            <FigStatusBadge status="verified" type="verification" />
            <FigStatusBadge status="pending" type="verification" />
            <FigStatusBadge status="expired" type="verification" />
          </div>
          
          <h3 class="text-lg font-medium text-gray-700 mb-3">Connection Statuses</h3>
          <div class="flex flex-wrap gap-3 mb-6">
            <FigStatusBadge status="active" type="connection" />
            <FigStatusBadge status="connected" type="connection" />
            <FigStatusBadge status="inactive" type="connection" />
            <FigStatusBadge status="disconnected" type="connection" />
          </div>
          
          <h3 class="text-lg font-medium text-gray-700 mb-3">Confidence Scores</h3>
          <div class="flex flex-wrap gap-3">
            <FigStatusBadge :status="95" />
            <FigStatusBadge :status="75" />
            <FigStatusBadge :status="50" />
          </div>
        </div>
      </section>
      
      <!-- Sizes -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Badge Sizes</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex flex-wrap items-center gap-3">
            <FigBadge size="xs" color="primary">Extra Small</FigBadge>
            <FigBadge size="sm" color="primary">Small</FigBadge>
            <FigBadge size="md" color="primary">Medium</FigBadge>
            <FigBadge size="lg" color="primary">Large</FigBadge>
            <FigBadge size="xl" color="primary">Extra Large</FigBadge>
          </div>
        </div>
      </section>
      
      <!-- Custom Icons -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Badges with Custom Icons</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex flex-wrap gap-3">
            <FigBadge color="primary" icon="i-heroicons-star">Featured</FigBadge>
            <FigBadge color="success" icon="i-heroicons-shield-check">Secure</FigBadge>
            <FigBadge color="warning" icon="i-heroicons-bolt">Fast</FigBadge>
            <FigBadge color="info" icon="i-heroicons-sparkles">New</FigBadge>
            <FigBadge color="error" trailing-icon="i-heroicons-x-mark">Deleted</FigBadge>
          </div>
        </div>
      </section>
      
      <!-- Status Badge Variants -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Status Badge Variants</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium text-gray-700 mb-3">Without Icons</h3>
          <div class="flex flex-wrap gap-3 mb-6">
            <FigStatusBadge status="pending" :show-icon="false" />
            <FigStatusBadge status="processing" :show-icon="false" />
            <FigStatusBadge status="completed" :show-icon="false" />
            <FigStatusBadge status="failed" :show-icon="false" />
          </div>
          
          <h3 class="text-lg font-medium text-gray-700 mb-3">Solid Variant</h3>
          <div class="flex flex-wrap gap-3">
            <FigStatusBadge status="pending" variant="solid" />
            <FigStatusBadge status="processing" variant="solid" />
            <FigStatusBadge status="completed" variant="solid" />
            <FigStatusBadge status="failed" variant="solid" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FigBadge, FigStatusBadge } from '@figgy/ui';
</script>