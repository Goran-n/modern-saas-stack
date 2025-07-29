<template>
  <section class="py-24 bg-neutral-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Not just another receipt scanner
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          Everyone extracts data. Only Figgy thinks like your bookkeeper.
        </p>
      </div>

      <!-- Comparison table -->
      <div class="max-w-5xl mx-auto">
        <div class="bg-white rounded-2xl shadow-subtle overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-neutral-100">
                <th class="text-left p-6 w-1/3"></th>
                <th class="p-6 text-center">
                  <div class="font-bold text-lg text-neutral-400">Traditional Apps</div>
                  <div class="text-sm text-neutral-500 mt-1">Dext, Receipt Bank, etc.</div>
                </th>
                <th class="p-6 text-center bg-primary-50">
                  <div class="font-bold text-lg text-primary-600">Figgy</div>
                  <div class="text-sm text-primary-500 mt-1">The invisible accountant</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in comparisonData" :key="index" class="border-b border-neutral-100">
                <td class="p-6 font-medium text-neutral-900">{{ row.feature }}</td>
                <td class="p-6 text-center">
                  <div v-if="row.traditional === true" class="inline-flex">
                    <Icon name="heroicons:check-circle" class="w-5 h-5 text-neutral-400" />
                  </div>
                  <div v-else-if="row.traditional === false" class="inline-flex">
                    <Icon name="heroicons:x-circle" class="w-5 h-5 text-neutral-300" />
                  </div>
                  <div v-else class="text-neutral-500 text-sm">{{ row.traditional }}</div>
                </td>
                <td class="p-6 text-center bg-primary-50">
                  <div v-if="row.figgy === true" class="inline-flex">
                    <Icon name="heroicons:check-circle" class="w-5 h-5 text-primary-600" />
                  </div>
                  <div v-else-if="row.figgy === false" class="inline-flex">
                    <Icon name="heroicons:x-circle" class="w-5 h-5 text-primary-300" />
                  </div>
                  <div v-else class="text-primary-700 font-medium text-sm">{{ row.figgy }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const comparisonData = [
  {
    feature: 'Extract receipt data',
    traditional: true,
    figgy: true
  },
  {
    feature: 'Interface',
    traditional: 'Download app',
    figgy: 'WhatsApp/Slack/Email'
  },
  {
    feature: 'Learn supplier details',
    traditional: false,
    figgy: true
  },
  {
    feature: 'Auto-reconcile payments',
    traditional: false,
    figgy: true
  },
  {
    feature: 'Chase missing invoices',
    traditional: false,
    figgy: true
  },
  {
    feature: 'Natural language queries',
    traditional: false,
    figgy: '"What\'s my VAT position?"'
  },
  {
    feature: 'Proactive alerts',
    traditional: false,
    figgy: true
  },
  {
    feature: 'Time to process',
    traditional: '2-5 minutes',
    figgy: '30 seconds'
  },
  {
    feature: 'Monthly effort',
    traditional: 'Hours of uploads',
    figgy: 'Zero - it\'s automatic'
  }
]
</script>