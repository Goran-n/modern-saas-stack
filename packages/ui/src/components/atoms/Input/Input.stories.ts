import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { FigInput } from "./index";

const meta = {
  title: "Atoms/Input",
  component: FigInput,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["outline", "filled", "underline"],
      description: "The visual variant of the input",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      description: "The size of the input",
    },
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "tel", "url", "search"],
      description: "The input type",
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
    },
    readonly: {
      control: "boolean",
      description: "Whether the input is readonly",
    },
    required: {
      control: "boolean",
      description: "Whether the input is required",
    },
    clearable: {
      control: "boolean",
      description: "Whether to show clear button",
    },
  },
  args: {
    variant: "outline",
    size: "md",
    type: "text",
    disabled: false,
    readonly: false,
    required: false,
    clearable: false,
  },
} satisfies Meta<typeof FigInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic input
export const Default: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const value = ref("");
      return { args, value };
    },
    template: `
      <FigInput v-bind="args" v-model="value" placeholder="Enter text..." />
    `,
  }),
};

// With label
export const WithLabel: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const value = ref("");
      return { args, value };
    },
    template: `
      <FigInput v-bind="args" v-model="value" label="Email Address" placeholder="john@example.com" type="email" />
    `,
  }),
};

// With hint
export const WithHint: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const value = ref("");
      return { args, value };
    },
    template: `
      <FigInput 
        v-bind="args" 
        v-model="value" 
        label="Password" 
        type="password"
        placeholder="Enter password"
        hint="Must be at least 8 characters long"
      />
    `,
  }),
};

// With error
export const WithError: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const value = ref("invalid-email");
      return { args, value };
    },
    template: `
      <FigInput 
        v-bind="args" 
        v-model="value" 
        label="Email" 
        type="email"
        error="Please enter a valid email address"
      />
    `,
  }),
};

// All variants
export const Variants: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const variants = ["outline", "filled", "underline"];
      return { args, variants };
    },
    template: `
      <div class="space-y-4">
        <FigInput 
          v-for="variant in variants" 
          :key="variant" 
          v-bind="args" 
          :variant="variant"
          :label="variant + ' variant'"
          placeholder="Enter text..."
        />
      </div>
    `,
  }),
};

// All sizes
export const Sizes: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const sizes = ["xs", "sm", "md", "lg", "xl"];
      return { args, sizes };
    },
    template: `
      <div class="space-y-4">
        <FigInput 
          v-for="size in sizes" 
          :key="size" 
          v-bind="args" 
          :size="size"
          :label="'Size ' + size"
          placeholder="Enter text..."
        />
      </div>
    `,
  }),
};

// With icons
export const WithIcons: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const email = ref("");
      const search = ref("");
      return { args, email, search };
    },
    template: `
      <div class="space-y-4">
        <FigInput v-bind="args" v-model="email" label="Email" placeholder="john@example.com">
          <template #leading>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </template>
        </FigInput>
        
        <FigInput v-bind="args" v-model="search" placeholder="Search..." clearable>
          <template #leading>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </template>
        </FigInput>
      </div>
    `,
  }),
};

// Required field
export const Required: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      const value = ref("");
      return { args, value };
    },
    template: `
      <FigInput 
        v-bind="args" 
        v-model="value" 
        label="Full Name" 
        placeholder="John Doe"
        required
      />
    `,
  }),
};

// Disabled and Readonly
export const States: Story = {
  render: (args) => ({
    components: { FigInput },
    setup() {
      return { args };
    },
    template: `
      <div class="space-y-4">
        <FigInput v-bind="args" label="Normal" value="Editable text" />
        <FigInput v-bind="args" label="Disabled" value="Disabled text" disabled />
        <FigInput v-bind="args" label="Readonly" value="Readonly text" readonly />
      </div>
    `,
  }),
};
