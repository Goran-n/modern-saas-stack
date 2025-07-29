<template>
  <div class="space-y-6">
    <!-- Trading Names -->
    <FigFormGroup label="Trading Names" description="Names your company trades under">
      <div class="space-y-2">
        <div 
          v-for="(_, index) in localNames.trading" 
          :key="`trading-${index}`"
          class="flex items-center gap-2"
        >
          <FigInput 
            v-model="localNames.trading[index]" 
            placeholder="Enter trading name"
            size="md"
            class="flex-1"
            @blur="updateNames"
          />
          <FigButton 
            color="error" 
            variant="ghost"
            size="sm"
            @click="removeTradingName(index)"
          >
            <Icon name="heroicons:trash" class="h-4 w-4" />
          </FigButton>
        </div>
        <FigButton 
          variant="soft"
          @click="addTradingName"
          size="sm"
        >
          <span class="flex items-center gap-2">
            <Icon name="heroicons:plus" class="h-4 w-4" />
            Add Trading Name
          </span>
        </FigButton>
      </div>
    </FigFormGroup>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Abbreviations -->
      <FigFormGroup label="Common Abbreviations" description="e.g., ABC, ABC Ltd">
        <FigInput 
          v-model="abbreviationsInput"
          placeholder="ABC Ltd"
          size="md"
          @keydown.enter.prevent="addAbbreviation"
        />
        <div v-if="localNames.abbreviations.length" class="mt-2 flex flex-wrap gap-2">
          <FigBadge 
            v-for="(abbr, index) in localNames.abbreviations" 
            :key="index"
            color="neutral"
            variant="solid"
            class="cursor-pointer group"
            @click="removeAbbreviation(index)"
          >
            {{ abbr }}
            <Icon name="heroicons:x-mark" class="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" />
          </FigBadge>
        </div>
      </FigFormGroup>

      <!-- Misspellings -->
      <FigFormGroup label="Common Misspellings" description="Help AI recognise typos">
        <FigInput 
          v-model="misspellingsInput"
          placeholder="Vepler, Veplar"
          size="md"
          @keydown.enter.prevent="addMisspelling"
        />
        <div v-if="localNames.misspellings.length" class="mt-2 flex flex-wrap gap-2">
          <FigBadge 
            v-for="(spell, index) in localNames.misspellings" 
            :key="index"
            color="neutral"
            variant="solid"
            class="cursor-pointer group"
            @click="removeMisspelling(index)"
          >
            {{ spell }}
            <Icon name="heroicons:x-mark" class="ml-1 h-3 w-3 opacity-60 group-hover:opacity-100" />
          </FigBadge>
        </div>
      </FigFormGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompanyConfig } from '@figgy/types';
import { FigFormGroup, FigInput, FigButton, FigBadge } from '@figgy/ui';

// Props & Emits
interface Props {
  names: CompanyConfig['names'];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:names': [names: CompanyConfig['names']];
}>();

// State
const localNames = ref<CompanyConfig['names']>({ ...props.names });
const abbreviationsInput = ref('');
const misspellingsInput = ref('');

// Methods
function updateNames() {
  emit('update:names', { ...localNames.value });
}

// Trading Names
function addTradingName() {
  localNames.value.trading.push('');
  updateNames();
}

function removeTradingName(index: number) {
  localNames.value.trading.splice(index, 1);
  updateNames();
}

// Abbreviations
function addAbbreviation() {
  if (abbreviationsInput.value.trim()) {
    localNames.value.abbreviations.push(abbreviationsInput.value.trim());
    abbreviationsInput.value = '';
    updateNames();
  }
}

function removeAbbreviation(index: number) {
  localNames.value.abbreviations.splice(index, 1);
  updateNames();
}

// Misspellings
function addMisspelling() {
  if (misspellingsInput.value.trim()) {
    localNames.value.misspellings.push(misspellingsInput.value.trim());
    misspellingsInput.value = '';
    updateNames();
  }
}

function removeMisspelling(index: number) {
  localNames.value.misspellings.splice(index, 1);
  updateNames();
}

// Watch for external changes
watch(() => props.names, (newNames) => {
  localNames.value = { ...newNames };
}, { deep: true });
</script>