<template>
  <section id="pricing" class="py-24 bg-canvas">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Simple, transparent pricing
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          One plan that grows with your business. No hidden fees, no surprises.
        </p>
      </div>

      <!-- Pricing cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <!-- Starter (for context) -->
        <div class="bg-white rounded-2xl p-8 shadow-subtle">
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold text-neutral-900 mb-2">Starter</h3>
            <p class="text-neutral-600">Perfect for freelancers</p>
            <div class="mt-6">
              <span class="text-4xl font-bold text-neutral-900">£29</span>
              <span class="text-neutral-600">/month</span>
            </div>
          </div>
          <ul class="space-y-4 mb-8">
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Up to 50 documents/month</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">WhatsApp & Email</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Basic reporting</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Email support</span>
            </li>
          </ul>
          <button class="w-full py-3 px-6 rounded-lg bg-neutral-100 text-neutral-700 font-medium hover:bg-neutral-200 transition-colors">
            Get Started
          </button>
        </div>

        <!-- Professional (featured) -->
        <div class="relative bg-primary-500 rounded-2xl p-8 shadow-modal transform scale-105">
          <!-- Popular badge -->
          <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div class="px-4 py-1 bg-secondary-500 text-white text-sm font-medium rounded-full">
              Most Popular
            </div>
          </div>
          
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold text-white mb-2">Professional</h3>
            <p class="text-primary-100">For growing businesses</p>
            <div class="mt-6">
              <span class="text-4xl font-bold text-white">£49</span>
              <span class="text-primary-100">/month</span>
            </div>
          </div>
          <ul class="space-y-4 mb-8">
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-300 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-white">Unlimited documents</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-300 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-white">All communication channels</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-300 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-white">Advanced AI insights</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-300 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-white">Bank reconciliation</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-300 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-white">Priority support</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-300 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-white">API access</span>
            </li>
          </ul>
          <button class="w-full py-3 px-6 rounded-lg bg-secondary-500 text-white font-medium hover:bg-secondary-600 transition-all transform hover:scale-105 shadow-floating">
            Get Started
          </button>
        </div>

        <!-- Enterprise -->
        <div class="bg-white rounded-2xl p-8 shadow-subtle">
          <div class="text-center mb-8">
            <h3 class="text-2xl font-bold text-neutral-900 mb-2">Enterprise</h3>
            <p class="text-neutral-600">For accounting firms</p>
            <div class="mt-6">
              <span class="text-4xl font-bold text-neutral-900">Custom</span>
            </div>
          </div>
          <ul class="space-y-4 mb-8">
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Multiple workspaces</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">White-label options</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Custom integrations</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">Dedicated account manager</span>
            </li>
            <li class="flex items-start">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-success-500 mt-0.5 mr-3 flex-shrink-0" />
              <span class="text-neutral-700">SLA guarantee</span>
            </li>
          </ul>
          <button class="w-full py-3 px-6 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors">
            Contact sales
          </button>
        </div>
      </div>

      <!-- Benefits -->
      <div class="mt-16 text-center">
        <h3 class="text-2xl font-bold text-neutral-900 mb-8">
          All plans include
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div class="flex items-center justify-center space-x-3">
            <Icon name="heroicons:shield-check" class="w-5 h-5 text-primary-500" />
            <span class="text-neutral-700">Bank-level security</span>
          </div>
          <div class="flex items-center justify-center space-x-3">
            <Icon name="heroicons:clock" class="w-5 h-5 text-primary-500" />
            <span class="text-neutral-700">Full feature access</span>
          </div>
          <div class="flex items-center justify-center space-x-3">
            <Icon name="heroicons:credit-card" class="w-5 h-5 text-primary-500" />
            <span class="text-neutral-700">Cancel anytime</span>
          </div>
        </div>
      </div>

      <!-- FAQ link -->
      <div class="mt-12 text-center">
        <p class="text-neutral-600 mb-4">
          Questions about pricing?
        </p>
        <a 
          href="#" 
          class="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          View pricing FAQ
          <Icon name="heroicons:arrow-right" class="w-4 h-4 ml-1" />
        </a>
      </div>
    </div>
  </section>
</template>