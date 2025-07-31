<template>
  <div class="min-h-screen bg-white">
    <!-- Minimal layout for onboarding - no navigation -->
    <slot />
  </div>
</template>

<script setup lang="ts">
// Onboarding layout - minimal with no navigation
// Prevents users from navigating away during onboarding

// Disable browser back button during onboarding
onMounted(() => {
  window.history.pushState(null, '', window.location.href)
  window.addEventListener('popstate', preventBack)
})

onUnmounted(() => {
  window.removeEventListener('popstate', preventBack)
})

function preventBack() {
  window.history.pushState(null, '', window.location.href)
}
</script>