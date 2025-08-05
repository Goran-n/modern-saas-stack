<template>
  <div>
    <Hero />
    <PainPoints />
    <Features />
    <Comparison />
    <WhoIsItFor />
    <Pricing />
  </div>
</template>

<script setup lang="ts">
import Hero from '~/components/landing/Hero.vue'
import PainPoints from '~/components/landing/PainPoints.vue'
import Features from '~/components/landing/Features.vue'
import Comparison from '~/components/landing/Comparison.vue'
import WhoIsItFor from '~/components/landing/WhoIsItFor.vue'
import Pricing from '~/components/landing/Pricing.vue'

// SEO meta tags are configured in nuxt.config.ts
// Additional page-specific meta can be added here if needed
</script>