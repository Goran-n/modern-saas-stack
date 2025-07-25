<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <FigContainer>
      <h1 class="text-3xl font-bold mb-8">Figgy UI Component Library Demo</h1>
      <p class="text-lg text-gray-600 mb-12">Custom component library built with Tailwind CSS v4 and Reka UI</p>
      
      <!-- Buttons Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-6">Buttons</h2>
        
        <!-- Variants -->
        <div class="mb-8">
          <h3 class="text-lg font-medium mb-4">Variants</h3>
          <div class="flex flex-wrap gap-4">
            <FigButton variant="solid">Solid Button</FigButton>
            <FigButton variant="outline">Outline Button</FigButton>
            <FigButton variant="ghost">Ghost Button</FigButton>
            <FigButton variant="soft">Soft Button</FigButton>
          </div>
        </div>
        
        <!-- Colors -->
        <div class="mb-8">
          <h3 class="text-lg font-medium mb-4">Colors</h3>
          <div class="flex flex-wrap gap-4">
            <FigButton color="primary">Primary</FigButton>
            <FigButton color="secondary">Secondary</FigButton>
            <FigButton color="success">Success</FigButton>
            <FigButton color="warning">Warning</FigButton>
            <FigButton color="error">Error</FigButton>
            <FigButton color="neutral">Neutral</FigButton>
          </div>
        </div>
        
        <!-- Sizes -->
        <div class="mb-8">
          <h3 class="text-lg font-medium mb-4">Sizes</h3>
          <div class="flex flex-wrap items-center gap-4">
            <FigButton size="xs">Extra Small</FigButton>
            <FigButton size="sm">Small</FigButton>
            <FigButton size="md">Medium</FigButton>
            <FigButton size="lg">Large</FigButton>
            <FigButton size="xl">Extra Large</FigButton>
          </div>
        </div>
        
        <!-- States -->
        <div class="mb-8">
          <h3 class="text-lg font-medium mb-4">States</h3>
          <div class="flex flex-wrap gap-4">
            <FigButton loading>Loading</FigButton>
            <FigButton disabled>Disabled</FigButton>
          </div>
        </div>
      </section>
      
      <!-- Other Components -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-6">Form Elements</h2>
        
        <div class="grid gap-6 max-w-md">
          <FigFormGroup label="Input Field" description="A basic input field">
            <FigInput placeholder="Enter text..." />
          </FigFormGroup>
          
          <FigFormGroup label="Select Field">
            <FigSelect simple>
              <option value="">Choose an option</option>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
              <option value="3">Option 3</option>
            </FigSelect>
          </FigFormGroup>
          
          <FigFormGroup label="Switch">
            <FigSwitch />
          </FigFormGroup>
        </div>
      </section>
      
      <!-- Badges -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold mb-6">Badges</h2>
        <div class="flex flex-wrap gap-4">
          <FigBadge>Default</FigBadge>
          <FigBadge color="primary">Primary</FigBadge>
          <FigBadge color="success">Success</FigBadge>
          <FigBadge color="warning">Warning</FigBadge>
          <FigBadge color="error">Error</FigBadge>
        </div>
      </section>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { 
  FigContainer, 
  FigButton, 
  FigInput, 
  FigSelect, 
  FigSwitch, 
  FigBadge,
  FigFormGroup 
} from '@figgy/ui';
</script>