<template>
  <section class="py-24 bg-red-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          What life looks like without Figgy
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          Sound familiar? This is your monthly routine.
        </p>
      </div>

      <!-- Pain points grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <div class="bg-white rounded-2xl p-6 shadow-subtle">
          <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Icon name="heroicons:magnifying-glass" class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-neutral-900 mb-2">
            Digging through inboxes
          </h3>
          <p class="text-neutral-600">
            Searching "receipt" in Gmail. Scrolling WhatsApp. Checking photo albums. Every. Single. Month.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-subtle">
          <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Icon name="heroicons:document-text" class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-neutral-900 mb-2">
            Naming files manually
          </h3>
          <p class="text-neutral-600">
            "2024_Jan_Coffee_Pret_Receipt_Final_v2.pdf" — and your accountant still can't find what they need.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-subtle">
          <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Icon name="heroicons:envelope" class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-neutral-900 mb-2">
            Email ping-pong
          </h3>
          <p class="text-neutral-600">
            Forward to accountant. They chase you anyway. "What's this £48.50 for?" Back and forth. Repeat.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-subtle">
          <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Icon name="heroicons:currency-pound" class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-neutral-900 mb-2">
            Missing VAT claims
          </h3>
          <p class="text-neutral-600">
            Lost receipts = lost money. That blurry photo? Rejected. Foreign currency? Too complicated.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-subtle">
          <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Icon name="heroicons:calendar" class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-neutral-900 mb-2">
            Month-end marathon
          </h3>
          <p class="text-neutral-600">
            3 days of chaos. Chasing colleagues. Matching payments. Fixing errors. Every. Single. Month.
          </p>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-subtle">
          <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <Icon name="heroicons:exclamation-triangle" class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-neutral-900 mb-2">
            Compliance anxiety
          </h3>
          <p class="text-neutral-600">
            "Did I keep that receipt?" HMRC knocking. Scrambling for proof. Sleepless nights.
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center">
        <div class="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-full font-bold text-lg">
          <Icon name="heroicons:arrow-down" class="w-5 h-5 mr-2" />
          Figgy ends this cycle — forever
        </div>
      </div>
    </div>
  </section>
</template>