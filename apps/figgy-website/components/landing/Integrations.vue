<template>
  <section id="integrations" class="py-16 bg-canvas-light">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-2">
          Works with everything you use
        </h2>
        <p class="text-lg text-neutral-600">
          Send docs your way. We'll handle the rest.
        </p>
      </div>

      <!-- Compact integration grid -->
      <div class="max-w-4xl mx-auto">
        <!-- Main integrations -->
        <div class="bg-white rounded-2xl p-8 shadow-subtle">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
            <!-- WhatsApp -->
            <div class="text-center group">
              <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Icon name="simple-icons:whatsapp" class="w-8 h-8 text-green-600" />
              </div>
              <p class="text-sm font-medium text-neutral-900">WhatsApp</p>
            </div>

            <!-- Slack -->
            <div class="text-center group">
              <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Icon name="simple-icons:slack" class="w-8 h-8 text-purple-600" />
              </div>
              <p class="text-sm font-medium text-neutral-900">Slack</p>
            </div>

            <!-- Email -->
            <div class="text-center group">
              <div class="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Icon name="heroicons:envelope" class="w-8 h-8 text-blue-600" />
              </div>
              <p class="text-sm font-medium text-neutral-900">Email</p>
            </div>

            <!-- Divider on mobile -->
            <div class="col-span-2 md:hidden"></div>

            <!-- Xero -->
            <div class="text-center group relative">
              <div class="absolute -top-2 -right-2 bg-success-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                Live
              </div>
              <div class="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Icon name="simple-icons:xero" class="w-8 h-8 text-blue-600" />
              </div>
              <p class="text-sm font-medium text-neutral-900">Xero</p>
            </div>

            <!-- QuickBooks -->
            <div class="text-center group relative">
              <div class="absolute -top-2 -right-2 bg-neutral-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                Soon
              </div>
              <div class="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Icon name="simple-icons:quickbooks" class="w-8 h-8 text-green-600" />
              </div>
              <p class="text-sm font-medium text-neutral-900">QuickBooks</p>
            </div>
          </div>

          <!-- Coming soon section -->
          <div class="mt-8 pt-8 border-t border-neutral-100">
            <p class="text-sm font-medium text-neutral-500 text-center mb-4">Coming soon</p>
            <div class="flex flex-wrap justify-center gap-3">
              <span class="text-sm px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full">Google Drive</span>
              <span class="text-sm px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full">Dropbox</span>
              <span class="text-sm px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full">Teams</span>
              <span class="text-sm px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full">Zapier</span>
              <span class="text-sm px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full">API</span>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="text-center mt-8">
          <a href="#" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Need something else? Let us know →
          </a>
        </div>
      </div>
    </div>
  </section>
</template>