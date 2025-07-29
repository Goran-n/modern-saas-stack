<template>
  <section class="py-24 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Who uses Figgy?
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <!-- Freelancers & Founders -->
        <div class="bg-gradient-to-br from-primary-50 to-white rounded-3xl p-8 border border-primary-100">
          <div class="text-4xl mb-4">👩‍💻</div>
          <h3 class="text-2xl font-bold text-neutral-900 mb-3">
            Freelancers & founders
          </h3>
          <p class="text-lg text-neutral-600 mb-6">
            who hate chasing receipts and wasting hours every month
          </p>
          <ul class="space-y-3">
            <li class="flex items-start">
              <Icon name="heroicons:check" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Stop the monthly scramble for receipts</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Never miss another VAT claim</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Focus on growing your business, not admin</span>
            </li>
          </ul>
        </div>

        <!-- Accountants -->
        <div class="bg-gradient-to-br from-success-50 to-white rounded-3xl p-8 border border-success-100">
          <div class="text-4xl mb-4">📊</div>
          <h3 class="text-2xl font-bold text-neutral-900 mb-3">
            Accountants
          </h3>
          <p class="text-lg text-neutral-600 mb-6">
            who want to serve more clients without growing headcount
          </p>
          <ul class="space-y-3">
            <li class="flex items-start">
              <Icon name="heroicons:check" class="w-5 h-5 text-success-600 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Slash document processing time by 70%</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check" class="w-5 h-5 text-success-600 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Clients send docs directly via WhatsApp</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check" class="w-5 h-5 text-success-600 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Clean, reconciled books every time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>