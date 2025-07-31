<template>
  <div class="space-y-1">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700"
    >
      {{ label }}
    </label>
    <input
      :id="inputId"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      :class="inputClasses"
      @input="handleInput"
    />
    <p
      v-if="error"
      class="text-sm text-red-600"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string;
  type?: "text" | "email" | "password" | "number";
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;

const inputClasses = computed(() => {
  const baseClasses = "block w-full rounded-md border px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const stateClasses = props.error
    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
    
  const disabledClasses = props.disabled
    ? "bg-gray-50 text-gray-500 cursor-not-allowed"
    : "bg-white text-gray-900";
  
  return [baseClasses, stateClasses, disabledClasses].join(" ");
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
}
</script>