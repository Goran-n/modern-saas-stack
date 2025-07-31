<template>
  <div class="w-full max-w-2xl">
    <transition name="slide-fade" mode="out-in">
      <!-- Company Basics Panel -->
      <div v-if="currentStep === 0" key="basics" class="space-y-8">
        <div class="text-center">
          <div class="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="heroicons:building-office-2" class="w-12 h-12 text-primary-600" />
          </div>
          <h2 class="text-3xl font-bold text-primary-900 mb-4">Let's get started</h2>
          <p class="text-lg text-primary-700">
            Your company information helps us accurately identify and categorize your documents
          </p>
        </div>
        
        <div class="bg-white/80 backdrop-blur rounded-2xl p-8 space-y-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="heroicons:document-magnifying-glass" class="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 class="font-semibold text-primary-900 mb-2">Smart Document Recognition</h3>
              <p class="text-primary-600">
                We'll automatically match invoices and receipts to your company, even when suppliers use variations of your name
              </p>
            </div>
          </div>
          
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="heroicons:shield-check" class="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 class="font-semibold text-primary-900 mb-2">Compliance Ready</h3>
              <p class="text-primary-600">
                Stay compliant with HMRC requirements and maintain accurate records for your accountant
              </p>
            </div>
          </div>
          
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="heroicons:clock" class="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 class="font-semibold text-primary-900 mb-2">Save Hours Every Month</h3>
              <p class="text-primary-600">
                Reduce manual data entry and focus on growing your business
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Configuration Panel -->
      <div v-else-if="currentStep === 1" key="financial" class="space-y-8">
        <div class="text-center">
          <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="heroicons:calculator" class="w-12 h-12 text-green-600" />
          </div>
          <h2 class="text-3xl font-bold text-primary-900 mb-4">Financial Configuration</h2>
          <p class="text-lg text-primary-700">
            Set up your accounting preferences for accurate financial tracking
          </p>
        </div>
        
        <div class="bg-white/80 backdrop-blur rounded-2xl p-8">
          <div class="grid grid-cols-2 gap-6 mb-8">
            <div class="text-center p-6 bg-primary-50 rounded-xl">
              <Icon name="heroicons:calendar" class="w-10 h-10 text-primary-600 mx-auto mb-3" />
              <h4 class="font-semibold text-primary-900 mb-1">Financial Year</h4>
              <p class="text-sm text-primary-600">Align with your reporting period</p>
            </div>
            <div class="text-center p-6 bg-primary-50 rounded-xl">
              <Icon name="heroicons:currency-pound" class="w-10 h-10 text-primary-600 mx-auto mb-3" />
              <h4 class="font-semibold text-primary-900 mb-1">Multi-Currency</h4>
              <p class="text-sm text-primary-600">Support for international transactions</p>
            </div>
          </div>
          
          <div class="space-y-4">
            <h3 class="font-semibold text-primary-900 mb-3">Accounting Methods Explained</h3>
            
            <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 class="font-medium text-blue-900 mb-1">Cash Basis</h4>
              <p class="text-sm text-blue-700">
                Record income when received and expenses when paid. Simpler for small businesses.
              </p>
            </div>
            
            <div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 class="font-medium text-purple-900 mb-1">Accrual Basis</h4>
              <p class="text-sm text-purple-700">
                Record income when earned and expenses when incurred. Required for larger businesses.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- VAT & Tax Panel -->
      <div v-else-if="currentStep === 2" key="vat" class="space-y-8">
        <div class="text-center">
          <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="heroicons:receipt-percent" class="w-12 h-12 text-blue-600" />
          </div>
          <h2 class="text-3xl font-bold text-primary-900 mb-4">VAT & Tax Setup</h2>
          <p class="text-lg text-primary-700">
            Configure your VAT settings for accurate tax calculations
          </p>
        </div>
        
        <div class="bg-white/80 backdrop-blur rounded-2xl p-8 space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <h4 class="font-semibold text-blue-900 mb-2">Standard Rate</h4>
              <p class="text-2xl font-bold text-blue-900 mb-1">20%</p>
              <p class="text-sm text-blue-700">Most goods and services</p>
            </div>
            <div class="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <h4 class="font-semibold text-green-900 mb-2">Reduced Rate</h4>
              <p class="text-2xl font-bold text-green-900 mb-1">5%</p>
              <p class="text-sm text-green-700">Home energy, children's car seats</p>
            </div>
          </div>
          
          <div class="space-y-4">
            <h3 class="font-semibold text-primary-900">VAT Schemes Available</h3>
            
            <div class="flex items-start gap-3">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 class="font-medium text-primary-900">Flat Rate Scheme</h4>
                <p class="text-sm text-primary-600">
                  Pay a fixed rate of VAT to HMRC and keep the difference
                </p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 class="font-medium text-primary-900">Cash Accounting</h4>
                <p class="text-sm text-primary-600">
                  Pay VAT only when your customers pay you
                </p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 class="font-medium text-primary-900">Annual Accounting</h4>
                <p class="text-sm text-primary-600">
                  Submit one VAT return per year with monthly payments
                </p>
              </div>
            </div>
          </div>
          
          <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center gap-2 mb-2">
              <Icon name="heroicons:information-circle" class="w-5 h-5 text-blue-600" />
              <h4 class="font-medium text-blue-900">Making Tax Digital (MTD)</h4>
            </div>
            <p class="text-sm text-blue-700">
              HMRC requires digital record keeping and quarterly submissions for VAT-registered businesses
            </p>
          </div>
        </div>
      </div>

      <!-- Document Recognition Panel -->
      <div v-else-if="currentStep === 3" key="recognition" class="space-y-8">
        <div class="text-center">
          <div class="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="heroicons:document-text" class="w-12 h-12 text-purple-600" />
          </div>
          <h2 class="text-3xl font-bold text-primary-900 mb-4">Smart Recognition</h2>
          <p class="text-lg text-primary-700">
            Help us recognize your documents better with these optional details
          </p>
        </div>
        
        <div class="bg-white/80 backdrop-blur rounded-2xl p-8 space-y-6">
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center p-4 bg-purple-50 rounded-full mb-4">
              <Icon name="heroicons:magnifying-glass" class="w-8 h-8 text-purple-600" />
            </div>
            <h3 class="text-xl font-semibold text-primary-900 mb-2">
              We'll automatically detect variations
            </h3>
            <p class="text-primary-600">
              Our AI learns from your documents to improve accuracy over time
            </p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <Icon name="heroicons:at-symbol" class="w-6 h-6 text-purple-600 mb-2" />
              <h4 class="font-medium text-purple-900 mb-1">Email Domains</h4>
              <p class="text-sm text-purple-700">Match emails from your domain</p>
            </div>
            <div class="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
              <Icon name="heroicons:tag" class="w-6 h-6 text-indigo-600 mb-2" />
              <h4 class="font-medium text-indigo-900 mb-1">Name Variations</h4>
              <p class="text-sm text-indigo-700">Common abbreviations and spellings</p>
            </div>
          </div>
          
          <div class="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
            <h4 class="font-semibold text-primary-900 mb-3">Examples of what we detect:</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-primary-600">✓ "ABC Ltd" → "ABC Limited"</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-primary-600">✓ "A.B.C." → "ABC"</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-primary-600">✓ Different invoice layouts from the same supplier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Integrations Panel -->
      <div v-else-if="currentStep === 4" key="integrations" class="space-y-8">
        <div class="text-center">
          <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="heroicons:puzzle-piece" class="w-12 h-12 text-green-600" />
          </div>
          <h2 class="text-3xl font-bold text-primary-900 mb-4">Connect Your Tools</h2>
          <p class="text-lg text-primary-700">
            Integrate with your existing workflow (optional)
          </p>
        </div>
        
        <div class="bg-white/80 backdrop-blur rounded-2xl p-8">
          <div class="grid grid-cols-2 gap-6 mb-8">
            <div class="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-center">
              <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Icon name="heroicons:envelope" class="w-8 h-8 text-blue-600" />
              </div>
              <h4 class="font-semibold text-blue-900 mb-1">Email Integration</h4>
              <p class="text-sm text-blue-700">Auto-import invoices from your inbox</p>
            </div>
            
            <div class="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl text-center">
              <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Icon name="heroicons:banknotes" class="w-8 h-8 text-green-600" />
              </div>
              <h4 class="font-semibold text-green-900 mb-1">Bank Connection</h4>
              <p class="text-sm text-green-700">Match transactions automatically</p>
            </div>
          </div>
          
          <div class="text-center p-6 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl">
            <Icon name="heroicons:sparkles" class="w-10 h-10 text-primary-600 mx-auto mb-3" />
            <h3 class="text-lg font-semibold text-primary-900 mb-2">
              You're all set!
            </h3>
            <p class="text-primary-700">
              You can always add integrations later from your settings
            </p>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const onboardingStore = useOnboardingStore()
const currentStep = computed(() => onboardingStore.currentStep)
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(40px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}
</style>