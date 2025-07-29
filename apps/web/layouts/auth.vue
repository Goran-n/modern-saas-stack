<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12">
    <FigContainer class="max-w-md">
      <div class="text-center mb-4">
        <NuxtLink to="/" class="inline-block">
          <img 
            src="/logo.png" 
            alt="Kibly" 
            class="h-12 w-auto mx-auto"
          />
        </NuxtLink>
      </div>
      
      <FigCard class="p-8 shadow-lg border-0 ring-1 ring-slate-200">
        <slot />
      </FigCard>
    </FigContainer>
  </div>
</template>

<script setup lang="ts">
import { FigContainer, FigCard } from '@figgy/ui';
</script>