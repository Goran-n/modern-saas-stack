<template>
  <div class="min-h-screen bg-canvas">
    <Navigation />
    <main>
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Navigation from '~/components/shared/Navigation.vue'
import Footer from '~/components/shared/Footer.vue'
</script>