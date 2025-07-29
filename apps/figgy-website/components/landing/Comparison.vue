<template>
  <section class="py-24 bg-neutral-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Not just another receipt scanner
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          Everyone extracts data. Only Figgy thinks like your bookkeeper.
        </p>
      </div>

      <!-- Visual comparison -->
      <div class="max-w-5xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Traditional Apps -->
          <div class="bg-white rounded-2xl p-8 border border-neutral-200">
            <div class="text-center mb-6">
              <h3 class="text-lg font-bold text-neutral-400 mb-1">Traditional Apps</h3>
              <p class="text-sm text-neutral-500">Dext, Receipt Bank, etc.</p>
            </div>
            
            <div class="space-y-4">
              <div class="flex items-start">
                <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700">Extract receipt data</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:x-circle" class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700">Requires app download</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:x-circle" class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700">Manual supplier management</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:x-circle" class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700">No payment matching</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:x-circle" class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700">You chase missing docs</span>
              </div>
              
              <div class="mt-6 pt-6 border-t border-neutral-100">
                <div class="text-center">
                  <div class="text-2xl font-bold text-neutral-400">2-5 min</div>
                  <div class="text-sm text-neutral-500">per invoice</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Figgy -->
          <div class="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-8 border-2 border-primary-200 relative">
            <div class="absolute -top-3 -right-3 bg-secondary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              BETTER
            </div>
            
            <div class="text-center mb-6">
              <h3 class="text-lg font-bold text-primary-600 mb-1">Figgy</h3>
              <p class="text-sm text-primary-500">The invisible accountant</p>
            </div>
            
            <div class="space-y-4">
              <div class="flex items-start">
                <Icon name="heroicons:check-circle" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700 font-medium">Extract everything + context</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:check-circle" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700 font-medium">Works in WhatsApp/Slack</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:check-circle" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700 font-medium">Learns your suppliers</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:check-circle" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700 font-medium">Auto-reconciles payments</span>
              </div>
              
              <div class="flex items-start">
                <Icon name="heroicons:check-circle" class="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                <span class="text-neutral-700 font-medium">Chases missing invoices for you</span>
              </div>
              
              <div class="mt-6 pt-6 border-t border-primary-100">
                <div class="text-center">
                  <div class="text-2xl font-bold text-primary-600">30 sec</div>
                  <div class="text-sm text-primary-500">fully automated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom highlights -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-xl p-4 text-center">
            <div class="text-2xl mb-1">💬</div>
            <p class="text-sm font-medium text-neutral-900">Ask in plain English</p>
            <p class="text-xs text-neutral-600 mt-1">"What's my VAT position?"</p>
          </div>
          
          <div class="bg-white rounded-xl p-4 text-center">
            <div class="text-2xl mb-1">🔄</div>
            <p class="text-sm font-medium text-neutral-900">Zero monthly effort</p>
            <p class="text-xs text-neutral-600 mt-1">It's completely automatic</p>
          </div>
          
          <div class="bg-white rounded-xl p-4 text-center">
            <div class="text-2xl mb-1">🎯</div>
            <p class="text-sm font-medium text-neutral-900">Never miss claims</p>
            <p class="text-xs text-neutral-600 mt-1">Figgy flags what others miss</p>
          </div>
        </div>

        <!-- CTA -->
        <div class="mt-12 text-center">
          <p class="text-lg text-neutral-700 mb-4">
            Stop wasting time with outdated tools
          </p>
          <button class="px-8 py-4 bg-secondary-500 hover:bg-secondary-600 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-floating">
            Switch to Figgy Today
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

