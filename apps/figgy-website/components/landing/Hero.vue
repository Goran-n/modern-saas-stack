<template>
  <section class="relative overflow-hidden bg-gradient-to-b from-canvas-light to-canvas pt-20 pb-32">
    <!-- Background decoration -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute top-40 right-10 w-72 h-72 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-40 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <!-- Badge -->
        <div class="inline-flex items-center px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm font-medium mb-8">
          <Icon name="heroicons:fire" class="w-4 h-4 mr-2" />
          Limited spots remaining for early access
        </div>

        <!-- Main headline -->
        <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-900 mb-6 leading-tight">
          You're losing money and time<br />
          <span class="text-primary-500">doing your books.</span><br />
          Figgy fixes both.
        </h1>

        <!-- Subheadline -->
        <p class="text-xl md:text-2xl text-neutral-600 mb-10 max-w-3xl mx-auto leading-relaxed">
          Stop wasting hours sorting invoices. Figgy reads, posts, and reconciles them for you automatically.
        </p>

        <!-- CTA Section -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <div class="flex-1 max-w-md">
            <input
              v-model="email"
              type="email"
              placeholder="Enter your work email"
              class="w-full px-6 py-4 rounded-lg border border-neutral-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-neutral-800 placeholder-neutral-400"
            />
          </div>
          <button class="w-full sm:w-auto px-8 py-4 bg-secondary-500 hover:bg-secondary-600 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-floating">
            Get Started
          </button>
        </div>

        <p class="text-sm text-neutral-500">
          Start automating your bookkeeping today
        </p>

        <!-- Social Proof -->
        <div class="mt-12 mb-8">
          <div class="inline-flex items-center bg-white rounded-full px-6 py-3 shadow-subtle">
            <div class="flex -space-x-2 mr-3">
              <div class="w-8 h-8 bg-primary-200 rounded-full border-2 border-white"></div>
              <div class="w-8 h-8 bg-success-200 rounded-full border-2 border-white"></div>
              <div class="w-8 h-8 bg-accent-200 rounded-full border-2 border-white"></div>
            </div>
            <p class="text-sm text-neutral-700">
              <span class="font-semibold">"We cut month-end from 3 days to 3 hours"</span> — Sarah, Dublin
            </p>
          </div>
        </div>

        <!-- Stats -->
        <div class="mt-8 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div>
            <div class="text-3xl font-bold text-primary-600">30 sec</div>
            <div class="text-sm text-neutral-600 mt-1">To process any invoice</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary-600">Zero</div>
            <div class="text-sm text-neutral-600 mt-1">Apps to download</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary-600">24/7</div>
            <div class="text-sm text-neutral-600 mt-1">Always reconciling</div>
          </div>
        </div>

        <!-- Product Screenshot Placeholder -->
        <div class="mt-20 relative">
          <div class="absolute inset-0 bg-gradient-to-t from-canvas to-transparent h-20 bottom-0 z-10"></div>
          <div class="rounded-xl shadow-modal overflow-hidden bg-neutral-100 border border-neutral-200">
            <div class="aspect-[16/9] flex items-center justify-center">
              <div class="text-neutral-400">
                <Icon name="heroicons:photo" class="w-24 h-24 mb-4 mx-auto" />
                <p class="text-lg">Product Screenshot</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const email = ref('')
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
</style>