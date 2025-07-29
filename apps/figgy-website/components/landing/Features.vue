<template>
  <section id="features" class="py-24 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Bookkeeping that<br />
          <span class="text-primary-500">works how you work</span>
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          You forward. We file, match, post, and report. It's that simple.
        </p>
      </div>

      <!-- Bento grid layout -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Feature cards -->
        <div 
          v-for="(feature, index) in features" 
          :key="index"
          class="group relative bg-gray-50 hover:bg-gray-100 rounded-3xl p-8 transition-all duration-300"
        >
          <div class="mb-6">
            <Icon 
              :name="feature.icon" 
              class="w-8 h-8 text-primary-500"
            />
          </div>
          
          <h3 class="text-2xl font-bold text-neutral-900 mb-3">
            {{ feature.title }}
          </h3>
          
          <p class="text-neutral-600 leading-relaxed mb-8">
            {{ feature.description }}
          </p>
          
          <!-- Placeholder image area -->
          <div class="relative w-full aspect-[3/4] bg-gradient-to-b from-white to-gray-100 rounded-2xl overflow-hidden">
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <Icon 
                  :name="feature.icon" 
                  class="w-16 h-16 text-gray-300 mx-auto mb-4"
                />
                <p class="text-gray-400 text-sm">{{ feature.placeholder }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- See how it works CTA -->
      <div class="mt-12 text-center">
        <a href="#how-it-works" class="inline-flex items-center space-x-2 text-primary-600 font-medium hover:text-primary-700 transition-colors">
          <span>See how it works</span>
          <Icon name="heroicons:arrow-down" class="w-5 h-5" />
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const features = [
  {
    icon: 'heroicons:paper-airplane',
    title: 'Just send the receipts',
    description: 'WhatsApp, Slack, Email. Pick your poison. No apps, no logins, no folders. Just forward and forget.',
    placeholder: 'Chat interface mockup'
  },
  {
    icon: 'heroicons:document-magnifying-glass',
    title: 'We read every receipt',
    description: 'Blurry photo? Crumpled paper? Foreign currency? Figgy gets it. Every line item, every VAT detail, every time.',
    placeholder: 'AI extraction in action'
  },
  {
    icon: 'heroicons:building-office-2',
    title: 'Your suppliers, memorised',
    description: 'Figgy learns who Pret is. Knows their VAT number. Catches when they change it. No more manual entry.',
    placeholder: 'Supplier intelligence view'
  },
  {
    icon: 'heroicons:credit-card',
    title: 'Bank rec on autopilot',
    description: '£48.50 from Barclays? That\'s the Uber receipt from Tuesday. Figgy matches everything, flags what\'s weird.',
    placeholder: 'Reconciliation magic'
  },
  {
    icon: 'heroicons:chart-bar',
    title: 'Ask anything, get answers',
    description: '"What\'s my coffee spend?" "Show unpaid invoices." "VAT breakdown?" Natural language, instant results.',
    placeholder: 'Conversational analytics'
  },
  {
    icon: 'heroicons:bell-alert',
    title: 'Your books chase themselves',
    description: 'Missing invoice from that supplier? Figgy asks them. Payment overdue? Figgy reminds you. Month-end? Already done.',
    placeholder: 'Proactive assistant'
  }
]
</script>