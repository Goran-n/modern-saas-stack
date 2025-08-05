<template>
  <div></div>
</template>

<script setup lang="ts">
// This file exists only to handle OAuth callbacks that were initiated with the old URL
// It immediately redirects to the actual OAuth callback handler

definePageMeta({
  auth: false,
  layout: false
})

if (process.client) {
  // Get the full query string and redirect to the new location
  const queryString = window.location.search
  window.location.href = `/settings/oauth-callback${queryString}`
}
</script>