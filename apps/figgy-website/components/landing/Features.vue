<template>
  <section id="features" class="py-24 bg-canvas-light">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Section header -->
      <div class="text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Everything you need to<br />
          <span class="text-primary-500">automate your bookkeeping</span>
        </h2>
        <p class="text-xl text-neutral-600 max-w-3xl mx-auto">
          Figgy handles the boring bits so you can focus on growing your business
        </p>
      </div>

      <!-- Bento grid layout -->
      <div class="space-y-8">
        <!-- Top row - Feature cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Chat-first approach -->
          <div class="bg-white rounded-2xl p-8 shadow-subtle">
            <div class="w-14 h-14 rounded-2xl border-2 border-blue-500 flex items-center justify-center mb-6">
              <Icon name="heroicons:chat-bubble-left-right" class="w-7 h-7 text-blue-500" />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 mb-3">
              Send invoices instantly
            </h3>
            <p class="text-neutral-600 leading-relaxed">
              WhatsApp, Slack, or Email. No apps to download, no logins to remember. 
              Just forward and forget.
            </p>
          </div>

          <!-- Smart document understanding -->
          <div class="bg-white rounded-2xl p-8 shadow-subtle">
            <div class="w-14 h-14 rounded-2xl border-2 border-blue-500 flex items-center justify-center mb-6">
              <Icon name="heroicons:document-magnifying-glass" class="w-7 h-7 text-blue-500" />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 mb-3">
              AI extracts everything
            </h3>
            <p class="text-neutral-600 leading-relaxed">
              Our AI reads every invoice, extracts key details, and learns your suppliers' formats automatically.
            </p>
          </div>

          <!-- Automatic supplier management -->
          <div class="bg-white rounded-2xl p-8 shadow-subtle">
            <div class="w-14 h-14 rounded-2xl border-2 border-blue-500 flex items-center justify-center mb-6">
              <Icon name="heroicons:building-office-2" class="w-7 h-7 text-blue-500" />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 mb-3">
              Smart supplier tracking
            </h3>
            <p class="text-neutral-600 leading-relaxed">
              Automatically builds detailed supplier profiles. Checks VAT numbers and keeps everything current.
            </p>
          </div>

          <!-- Bank reconciliation -->
          <div class="bg-white rounded-2xl p-8 shadow-subtle">
            <div class="w-14 h-14 rounded-2xl border-2 border-blue-500 flex items-center justify-center mb-6">
              <Icon name="heroicons:credit-card" class="w-7 h-7 text-blue-500" />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 mb-3">
              Match payments instantly
            </h3>
            <p class="text-neutral-600 leading-relaxed">
              Matches invoices to bank payments automatically. Flags discrepancies to keep cash flow clear.
            </p>
          </div>

          <!-- Real-time reporting -->
          <div class="bg-white rounded-2xl p-8 shadow-subtle">
            <div class="w-14 h-14 rounded-2xl border-2 border-blue-500 flex items-center justify-center mb-6">
              <Icon name="heroicons:chart-bar" class="w-7 h-7 text-blue-500" />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 mb-3">
              See insights immediately
            </h3>
            <p class="text-neutral-600 leading-relaxed">
              Spending patterns, VAT claims, and cash forecasts. Ask questions in plain English.
            </p>
          </div>

          <!-- Proactive assistance -->
          <div class="bg-white rounded-2xl p-8 shadow-subtle">
            <div class="w-14 h-14 rounded-2xl border-2 border-blue-500 flex items-center justify-center mb-6">
              <Icon name="heroicons:bell-alert" class="w-7 h-7 text-blue-500" />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 mb-3">
              Never miss anything
            </h3>
            <p class="text-neutral-600 leading-relaxed">
              Figgy chases missing invoices, reminds about deadlines, and alerts you to anomalies.
            </p>
          </div>
        </div>

        <!-- Bottom row - Large showcase -->
        <div class="bg-white rounded-2xl shadow-floating overflow-hidden">
          <div class="grid grid-cols-1 lg:grid-cols-2">
            <!-- Left side - Demo interface -->
            <div class="p-12 bg-gradient-to-br from-blue-50 to-white">
              <div class="mb-6">
                <span class="text-sm font-medium text-blue-600 uppercase tracking-wider">Live Demo</span>
                <h3 class="text-2xl font-bold text-neutral-900 mt-2">See Figgy in action</h3>
              </div>
              
              <!-- WhatsApp-style chat interface -->
              <div class="bg-white rounded-xl shadow-subtle p-4 max-w-md">
                <div class="flex items-center space-x-3 mb-4 pb-4 border-b">
                  <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold">F</span>
                  </div>
                  <div>
                    <p class="font-semibold text-neutral-900">Figgy</p>
                    <p class="text-xs text-green-600">● Online</p>
                  </div>
                </div>
                
                <!-- Chat messages -->
                <div class="space-y-3">
                  <div class="flex justify-end">
                    <div class="bg-green-100 rounded-2xl rounded-br-sm px-4 py-2 max-w-[70%]">
                      <p class="text-sm text-neutral-800">Here's today's coffee receipt</p>
                      <div class="mt-2 bg-neutral-200 rounded-lg p-2 flex items-center space-x-2">
                        <Icon name="heroicons:photo" class="w-5 h-5 text-neutral-500" />
                        <span class="text-xs text-neutral-600">receipt_coffee.jpg</span>
                      </div>
                      <p class="text-xs text-neutral-500 mt-1">10:42 AM</p>
                    </div>
                  </div>
                  
                  <div class="flex justify-start">
                    <div class="bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[70%]">
                      <p class="text-sm text-neutral-800">✅ Receipt processed!</p>
                      <p class="text-sm text-neutral-600 mt-1">
                        <strong>Pret A Manger</strong><br/>
                        Amount: £12.50 (inc VAT £2.08)<br/>
                        Category: Office Supplies
                      </p>
                      <p class="text-xs text-neutral-500 mt-2">10:42 AM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right side - Results display -->
            <div class="p-12 border-l border-neutral-100">
              <div class="mb-6">
                <span class="text-sm font-medium text-green-600 uppercase tracking-wider">Instant Results</span>
                <h3 class="text-2xl font-bold text-neutral-900 mt-2">Data extracted & organised</h3>
              </div>

              <!-- Extracted data display -->
              <div class="space-y-4">
                <div class="bg-green-50 rounded-lg p-4">
                  <p class="text-sm font-semibold text-green-800 mb-2">✓ Document processed successfully</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span class="text-neutral-600">Type:</span>
                      <span class="font-medium text-neutral-900 ml-2">Receipt</span>
                    </div>
                    <div>
                      <span class="text-neutral-600">Status:</span>
                      <span class="font-medium text-green-600 ml-2">Completed</span>
                    </div>
                  </div>
                </div>

                <div class="border rounded-lg p-4">
                  <h4 class="font-semibold text-neutral-900 mb-3">Extracted Information</h4>
                  <dl class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <dt class="text-neutral-600">Supplier:</dt>
                      <dd class="font-medium">Pret A Manger Ltd</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-neutral-600">VAT Number:</dt>
                      <dd class="font-medium">GB 123 4567 89</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-neutral-600">Total Amount:</dt>
                      <dd class="font-medium">£12.50</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-neutral-600">VAT (20%):</dt>
                      <dd class="font-medium">£2.08</dd>
                    </div>
                    <div class="flex justify-between">
                      <dt class="text-neutral-600">Category:</dt>
                      <dd class="font-medium">Office Supplies</dd>
                    </div>
                  </dl>
                </div>

                <div class="flex items-center space-x-3 pt-2">
                  <button class="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
                    Post to Xero
                  </button>
                  <button class="px-4 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>