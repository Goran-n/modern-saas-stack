<template>
  <section id="how-it-works" class="py-24 bg-canvas">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-16">
        <div class="inline-flex items-center px-4 py-2 rounded-full bg-success-100 text-success-700 text-sm font-medium mb-4">
          <Icon name="heroicons:check-circle" class="w-4 h-4 mr-2" />
          Simple 4-step process
        </div>
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          How Figgy works
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          From receipt to reconciliation in seconds, not hours
        </p>
      </div>

      <!-- Steps -->
      <div class="relative">
        <!-- Connection line (hidden on mobile) -->
        <div class="hidden lg:block absolute top-24 left-20 right-20 h-0.5 bg-neutral-200"></div>
        
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-4">
          <!-- Step 1 -->
          <div class="relative text-center">
            <div class="relative inline-flex">
              <div class="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-floating">
                1
              </div>
              <div class="absolute -top-2 -right-2 w-8 h-8 bg-secondary-500 rounded-full flex items-center justify-center">
                <Icon name="heroicons:paper-airplane" class="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 class="text-xl font-semibold text-neutral-900 mt-6 mb-3">
              Send Documents
            </h3>
            <p class="text-neutral-600">
              Forward invoices and receipts via WhatsApp, Slack, Email, or upload directly
            </p>
          </div>

          <!-- Step 2 -->
          <div class="relative text-center">
            <div class="relative inline-flex">
              <div class="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-floating">
                2
              </div>
              <div class="absolute -top-2 -right-2 w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
                <Icon name="heroicons:cpu-chip" class="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 class="text-xl font-semibold text-neutral-900 mt-6 mb-3">
              AI Extracts Data
            </h3>
            <p class="text-neutral-600">
              Figgy reads and understands each document, extracting all relevant information
            </p>
          </div>

          <!-- Step 3 -->
          <div class="relative text-center">
            <div class="relative inline-flex">
              <div class="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-floating">
                3
              </div>
              <div class="absolute -top-2 -right-2 w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center">
                <Icon name="heroicons:arrow-path" class="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 class="text-xl font-semibold text-neutral-900 mt-6 mb-3">
              Auto-Posts to Xero
            </h3>
            <p class="text-neutral-600">
              Data flows seamlessly to your accounting software with smart categorisation
            </p>
          </div>

          <!-- Step 4 -->
          <div class="relative text-center">
            <div class="relative inline-flex">
              <div class="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-floating">
                4
              </div>
              <div class="absolute -top-2 -right-2 w-8 h-8 bg-warning-500 rounded-full flex items-center justify-center">
                <Icon name="heroicons:chart-pie" class="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 class="text-xl font-semibold text-neutral-900 mt-6 mb-3">
              Get Insights
            </h3>
            <p class="text-neutral-600">
              View reports, track spending, and ask questions about your finances
            </p>
          </div>
        </div>
      </div>

      <!-- Example use cases -->
      <div class="mt-20 bg-white rounded-2xl p-8 shadow-subtle">
        <h3 class="text-2xl font-bold text-neutral-900 mb-6 text-center">
          Real examples from real users
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="flex items-start space-x-3">
            <div class="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="heroicons:check" class="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p class="text-sm text-neutral-600">
                <span class="font-semibold text-neutral-800">Coffee receipt via WhatsApp:</span> 
                Extracted, categorised as "Office Supplies", matched to card payment
              </p>
            </div>
          </div>
          <div class="flex items-start space-x-3">
            <div class="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="heroicons:check" class="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p class="text-sm text-neutral-600">
                <span class="font-semibold text-neutral-800">AWS invoice in email:</span> 
                VAT extracted, supplier verified, recurring expense tracked
              </p>
            </div>
          </div>
          <div class="flex items-start space-x-3">
            <div class="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="heroicons:check" class="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p class="text-sm text-neutral-600">
                <span class="font-semibold text-neutral-800">Contractor invoice in Slack:</span> 
                Flagged missing VAT number, prompted for clarification
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center mt-12">
        <button class="inline-flex items-center px-8 py-4 bg-secondary-500 hover:bg-secondary-600 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-floating">
          Get Started Now
          <Icon name="heroicons:arrow-right" class="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  </section>
</template>