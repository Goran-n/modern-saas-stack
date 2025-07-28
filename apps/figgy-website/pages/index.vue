<template>
  <div>
    <Hero />
    <Features />
    <HowItWorks />
    <Integrations />
    <Pricing />
    <Testimonials />
  </div>
</template>

<script setup lang="ts">
import Hero from '~/components/landing/Hero.vue'
import Features from '~/components/landing/Features.vue'
import HowItWorks from '~/components/landing/HowItWorks.vue'
import Integrations from '~/components/landing/Integrations.vue'
import Pricing from '~/components/landing/Pricing.vue'
import Testimonials from '~/components/landing/Testimonials.vue'

// SEO meta tags are configured in nuxt.config.ts
// Additional page-specific meta can be added here if needed
</script>