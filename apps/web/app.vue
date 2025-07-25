<template>
  <FigApp>
    <NuxtLoadingIndicator />
    
    <!-- Main app content -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </FigApp>
</template>

<script setup lang="ts">
import { FigApp } from '@figgy/ui';

// Set default meta tags
useHead({
  title: 'Figgy',
  titleTemplate: '%s - Figgy',
  meta: [
    { name: 'description', content: 'Figgy - Your financial management platform' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

// Initialize color mode
const colorMode = useColorMode()

// Set up color mode preferences
onMounted(() => {
  if (colorMode.preference === 'system') {
    colorMode.preference = 'light'
  }
})
</script>