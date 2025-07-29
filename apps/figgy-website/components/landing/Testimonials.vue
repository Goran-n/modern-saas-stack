<template>
  <section class="py-24 bg-canvas-light">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Real results from real businesses
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          Here's what our customers say about their time and money saved
        </p>
      </div>

      <!-- Testimonials grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Testimonial 1 -->
        <div class="bg-white rounded-xl p-8 shadow-subtle">
          <div class="flex items-center mb-6">
            <div class="flex text-warning-500">
              <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-neutral-700 mb-6 leading-relaxed">
            "We cut month-end from 3 days to 3 hours. Just forward receipts to WhatsApp — 
            Figgy does everything else. My accountant couldn't believe the difference."
          </p>
          <div class="flex items-center">
            <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
              <span class="text-primary-600 font-semibold">SM</span>
            </div>
            <div>
              <p class="font-semibold text-neutral-900">Sarah Mitchell</p>
              <p class="text-sm text-neutral-600">Freelance Designer, Dublin</p>
            </div>
          </div>
        </div>

        <!-- Testimonial 2 -->
        <div class="bg-white rounded-xl p-8 shadow-subtle">
          <div class="flex items-center mb-6">
            <div class="flex text-warning-500">
              <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-neutral-700 mb-6 leading-relaxed">
            "Used to miss VAT claims constantly. Now Figgy catches everything — blurry photos, 
            foreign receipts, everything. Never leaving money on the table again."
          </p>
          <div class="flex items-center">
            <div class="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mr-4">
              <span class="text-success-600 font-semibold">JC</span>
            </div>
            <div>
              <p class="font-semibold text-neutral-900">James Chen</p>
              <p class="text-sm text-neutral-600">E-commerce Founder, London</p>
            </div>
          </div>
        </div>

        <!-- Testimonial 3 -->
        <div class="bg-white rounded-xl p-8 shadow-subtle">
          <div class="flex items-center mb-6">
            <div class="flex text-warning-500">
              <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-neutral-700 mb-6 leading-relaxed">
            "We handle books for 25 clients. Figgy cut our document processing time by 70%. 
            Clients love the WhatsApp integration - compliance has never been easier."
          </p>
          <div class="flex items-center">
            <div class="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mr-4">
              <span class="text-accent-600 font-semibold">RB</span>
            </div>
            <div>
              <p class="font-semibold text-neutral-900">Rachel Brown</p>
              <p class="text-sm text-neutral-600">Brown & Associates Accounting</p>
            </div>
          </div>
        </div>

        <!-- Testimonial 4 -->
        <div class="bg-white rounded-xl p-8 shadow-subtle">
          <div class="flex items-center mb-6">
            <div class="flex text-warning-500">
              <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-neutral-700 mb-6 leading-relaxed">
            "The supplier management is brilliant. Figgy knows all our regular vendors and 
            catches any anomalies. It's like having a bookkeeper who never sleeps."
          </p>
          <div class="flex items-center">
            <div class="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mr-4">
              <span class="text-secondary-600 font-semibold">MO</span>
            </div>
            <div>
              <p class="font-semibold text-neutral-900">Michael O'Brien</p>
              <p class="text-sm text-neutral-600">Restaurant Owner, Cork</p>
            </div>
          </div>
        </div>

        <!-- Testimonial 5 -->
        <div class="bg-white rounded-xl p-8 shadow-subtle">
          <div class="flex items-center mb-6">
            <div class="flex text-warning-500">
              <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-neutral-700 mb-6 leading-relaxed">
            "No more 'What's this payment for?' emails. Figgy matches everything automatically. 
            My accountant says it's the cleanest books they've ever seen."
          </p>
          <div class="flex items-center">
            <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
              <span class="text-primary-600 font-semibold">AP</span>
            </div>
            <div>
              <p class="font-semibold text-neutral-900">Anna Patel</p>
              <p class="text-sm text-neutral-600">Marketing Consultant, Manchester</p>
            </div>
          </div>
        </div>

        <!-- Testimonial 6 -->
        <div class="bg-white rounded-xl p-8 shadow-subtle">
          <div class="flex items-center mb-6">
            <div class="flex text-warning-500">
              <Icon v-for="i in 5" :key="i" name="heroicons:star-solid" class="w-5 h-5" />
            </div>
          </div>
          <p class="text-neutral-700 mb-6 leading-relaxed">
            "Figgy pays for itself. The time saved, the VAT caught, the stress reduced - 
            it's the best £49 I spend each month. Can't imagine going back."
          </p>
          <div class="flex items-center">
            <div class="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mr-4">
              <span class="text-success-600 font-semibold">TS</span>
            </div>
            <div>
              <p class="font-semibold text-neutral-900">Tom Singh</p>
              <p class="text-sm text-neutral-600">Tech Startup Founder, Edinburgh</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-20 text-center">
        <p class="text-lg text-neutral-600 mb-6">
          Ready to get your time back?
        </p>
        <button class="px-8 py-4 bg-secondary-500 hover:bg-secondary-600 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-floating">
          Start Your Free Trial
        </button>
      </div>
    </div>
  </section>
</template>