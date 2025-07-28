<template>
  <section id="integrations" class="py-24 bg-canvas-light">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Works with your existing tools
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          Figgy integrates seamlessly with the tools you already use and love
        </p>
      </div>

      <!-- Integration categories -->
      <div class="space-y-16">
        <!-- Communication channels -->
        <div>
          <h3 class="text-2xl font-semibold text-neutral-900 mb-8 text-center">
            Send documents your way
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <!-- WhatsApp -->
            <div class="bg-white rounded-xl p-6 shadow-subtle hover:shadow-floating transition-all group">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon name="simple-icons:whatsapp" class="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h4 class="font-semibold text-neutral-900">WhatsApp</h4>
                  <p class="text-sm text-neutral-600">Forward receipts instantly</p>
                </div>
              </div>
            </div>

            <!-- Slack -->
            <div class="bg-white rounded-xl p-6 shadow-subtle hover:shadow-floating transition-all group">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon name="simple-icons:slack" class="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h4 class="font-semibold text-neutral-900">Slack</h4>
                  <p class="text-sm text-neutral-600">Drop files in a channel</p>
                </div>
              </div>
            </div>

            <!-- Email -->
            <div class="bg-white rounded-xl p-6 shadow-subtle hover:shadow-floating transition-all group">
              <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon name="heroicons:envelope" class="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h4 class="font-semibold text-neutral-900">Email</h4>
                  <p class="text-sm text-neutral-600">Forward to your inbox</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Accounting software -->
        <div>
          <h3 class="text-2xl font-semibold text-neutral-900 mb-8 text-center">
            Connects to your accounting software
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <!-- Xero -->
            <div class="bg-white rounded-xl p-8 shadow-subtle hover:shadow-floating transition-all group">
              <div class="flex flex-col items-center text-center">
                <div class="w-20 h-20 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon name="simple-icons:xero" class="w-12 h-12 text-blue-600" />
                </div>
                <h4 class="font-semibold text-neutral-900 mb-2">Xero</h4>
                <p class="text-sm text-neutral-600">
                  Full two-way sync with automatic posting and reconciliation
                </p>
                <div class="mt-4 flex items-center text-sm text-success-600 font-medium">
                  <Icon name="heroicons:check-circle" class="w-4 h-4 mr-1" />
                  Certified partner
                </div>
              </div>
            </div>

            <!-- QuickBooks -->
            <div class="bg-white rounded-xl p-8 shadow-subtle hover:shadow-floating transition-all group">
              <div class="flex flex-col items-center text-center">
                <div class="w-20 h-20 bg-green-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon name="simple-icons:quickbooks" class="w-12 h-12 text-green-600" />
                </div>
                <h4 class="font-semibold text-neutral-900 mb-2">QuickBooks</h4>
                <p class="text-sm text-neutral-600">
                  Seamless integration with QuickBooks Online
                </p>
                <div class="mt-4 flex items-center text-sm text-neutral-500 font-medium">
                  <Icon name="heroicons:clock" class="w-4 h-4 mr-1" />
                  Coming soon
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional integrations -->
        <div>
          <h3 class="text-2xl font-semibold text-neutral-900 mb-8 text-center">
            Plus many more
          </h3>
          <div class="flex flex-wrap justify-center gap-4">
            <div class="px-6 py-3 bg-white rounded-lg shadow-subtle text-neutral-700 font-medium">
              Google Drive
            </div>
            <div class="px-6 py-3 bg-white rounded-lg shadow-subtle text-neutral-700 font-medium">
              Dropbox
            </div>
            <div class="px-6 py-3 bg-white rounded-lg shadow-subtle text-neutral-700 font-medium">
              Microsoft Teams
            </div>
            <div class="px-6 py-3 bg-white rounded-lg shadow-subtle text-neutral-700 font-medium">
              Zapier
            </div>
            <div class="px-6 py-3 bg-white rounded-lg shadow-subtle text-neutral-700 font-medium">
              API Access
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center mt-16">
        <p class="text-neutral-600 mb-4">
          Don't see your tool? We're always adding more integrations.
        </p>
        <a 
          href="#" 
          class="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          Request an integration
          <Icon name="heroicons:arrow-right" class="w-4 h-4 ml-1" />
        </a>
      </div>
    </div>
  </section>
</template>