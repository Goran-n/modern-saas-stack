<template>
  <div class="min-h-screen bg-neutral-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">Design System Components</h1>
        <p class="text-neutral-600">Component library and design system playground</p>
      </div>

      <div class="space-y-12">
        <!-- Color Palette -->
        <section>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-6">Color Palette</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Primary Colors -->
            <div>
              <h3 class="text-lg font-medium text-neutral-800 mb-3">Primary</h3>
              <div class="space-y-2">
                <div v-for="shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]" :key="shade" 
                     :class="`bg-primary-${shade}`" 
                     class="h-10 rounded flex items-center px-3 text-sm font-medium"
                     :class="shade >= 600 ? 'text-white' : 'text-neutral-900'">
                  primary-{{ shade }}
                </div>
              </div>
            </div>

            <!-- Neutral Colors -->
            <div>
              <h3 class="text-lg font-medium text-neutral-800 mb-3">Neutral</h3>
              <div class="space-y-2">
                <div v-for="shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]" :key="shade" 
                     :class="`bg-neutral-${shade}`" 
                     class="h-10 rounded flex items-center px-3 text-sm font-medium"
                     :class="shade >= 600 ? 'text-white' : 'text-neutral-900'">
                  neutral-{{ shade }}
                </div>
              </div>
            </div>

            <!-- Success Colors -->
            <div>
              <h3 class="text-lg font-medium text-neutral-800 mb-3">Success</h3>
              <div class="space-y-2">
                <div v-for="shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]" :key="shade" 
                     :class="`bg-success-${shade}`" 
                     class="h-10 rounded flex items-center px-3 text-sm font-medium"
                     :class="shade >= 600 ? 'text-white' : 'text-neutral-900'">
                  success-{{ shade }}
                </div>
              </div>
            </div>

            <!-- Error Colors -->
            <div>
              <h3 class="text-lg font-medium text-neutral-800 mb-3">Error</h3>
              <div class="space-y-2">
                <div v-for="shade in [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]" :key="shade" 
                     :class="`bg-error-${shade}`" 
                     class="h-10 rounded flex items-center px-3 text-sm font-medium"
                     :class="shade >= 600 ? 'text-white' : 'text-neutral-900'">
                  error-{{ shade }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Typography -->
        <section>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-6">Typography</h2>
          <div class="space-y-4">
            <div class="text-3xl font-bold">Heading 1 - Bold 3xl</div>
            <div class="text-2xl font-semibold">Heading 2 - Semibold 2xl</div>
            <div class="text-xl font-medium">Heading 3 - Medium xl</div>
            <div class="text-lg font-medium">Heading 4 - Medium lg</div>
            <div class="text-base">Body text - Regular base</div>
            <div class="text-sm text-neutral-600">Small text - Regular sm</div>
            <div class="text-2xs text-neutral-500">Extra small text - Regular 2xs</div>
          </div>
        </section>

        <!-- Buttons -->
        <section>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-6">Buttons</h2>
          
          <!-- Button Variants -->
          <div class="space-y-8">
            <div>
              <h3 class="text-lg font-medium text-neutral-800 mb-4">Variants</h3>
              <div class="flex flex-wrap gap-4">
                <BaseButton variant="primary">Primary</BaseButton>
                <BaseButton variant="secondary">Secondary</BaseButton>
                <BaseButton variant="success">Success</BaseButton>
                <BaseButton variant="error">Error</BaseButton>
                <BaseButton variant="ghost">Ghost</BaseButton>
              </div>
            </div>

            <!-- Button Sizes -->
            <div>
              <h3 class="text-lg font-medium text-neutral-800 mb-4">Sizes</h3>
              <div class="flex flex-wrap items-center gap-4">
                <BaseButton size="sm">Small</BaseButton>
                <BaseButton size="md">Medium</BaseButton>
                <BaseButton size="lg">Large</BaseButton>
              </div>
            </div>

            <!-- Button States -->
            <div>
              <h3 class="text-lg font-medium text-neutral-800 mb-4">States</h3>
              <div class="flex flex-wrap gap-4">
                <BaseButton>Default</BaseButton>
                <BaseButton :loading="true">Loading</BaseButton>
                <BaseButton disabled>Disabled</BaseButton>
                <BaseButton :leading-icon="PlusIcon">With Icon</BaseButton>
                <BaseButton icon-only :leading-icon="PlusIcon" />
              </div>
            </div>
          </div>
        </section>

        <!-- Form Inputs -->
        <section>
          <h2 class="text-2xl font-semibold text-neutral-900 mb-6">Form Inputs</h2>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Input Examples -->
            <div class="space-y-6">
              <FormField label="Default Input" helper-text="This is a helper text">
                <BaseInput v-model="sampleText" placeholder="Enter text..." />
              </FormField>

              <FormField label="Email Input" required>
                <BaseInput v-model="sampleEmail" type="email" placeholder="Enter email..." />
              </FormField>

              <FormField label="Password Input" required>
                <BaseInput v-model="samplePassword" type="password" placeholder="Enter password..." />
              </FormField>

              <FormField label="Input with Error" :error-message="'This field is required'">
                <BaseInput v-model="sampleError" placeholder="This has an error..." />
              </FormField>

              <FormField label="Search Input">
                <SearchInput v-model="sampleSearch" placeholder="Search..." />
              </FormField>
            </div>

            <!-- Input Sizes -->
            <div class="space-y-6">
              <FormField label="Small Input">
                <BaseInput v-model="sampleText" size="sm" placeholder="Small input..." />
              </FormField>

              <FormField label="Medium Input">
                <BaseInput v-model="sampleText" size="md" placeholder="Medium input..." />
              </FormField>

              <FormField label="Large Input">
                <BaseInput v-model="sampleText" size="lg" placeholder="Large input..." />
              </FormField>

              <FormField label="Disabled Input">
                <BaseInput v-model="sampleText" disabled placeholder="Disabled input..." />
              </FormField>

              <FormField label="Input with Icons">
                <BaseInput 
                  v-model="sampleText" 
                  :leading-icon="UserIcon"
                  :trailing-icon="CheckCircleIcon"
                  placeholder="Input with icons..." 
                />
              </FormField>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PlusIcon, UserIcon } from '@heroicons/vue/24/outline'
import { CheckCircleIcon } from '@heroicons/vue/20/solid'
import BaseButton from '../ui/BaseButton.vue'
import BaseInput from '../ui/BaseInput.vue'
import SearchInput from '../ui/SearchInput.vue'
import FormField from '../form/FormField.vue'

// Sample data for playground
const sampleText = ref('')
const sampleEmail = ref('')
const samplePassword = ref('')
const sampleError = ref('')
const sampleSearch = ref('')
</script>