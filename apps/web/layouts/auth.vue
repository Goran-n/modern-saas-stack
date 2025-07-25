<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12">
    <FigContainer class="max-w-md">
      <div class="text-center mb-8">
        <NuxtLink to="/" class="inline-flex items-center mb-6">
          <div class="h-10 w-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-sm">
            <span class="text-white font-bold text-xl">K</span>
          </div>
          <span class="ml-3 text-2xl font-semibold text-slate-900">Figgy</span>
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