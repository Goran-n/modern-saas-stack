import type { Meta, StoryObj } from "@storybook/vue3";
import { FigButton } from "./index";

const meta = {
  title: "Atoms/Button",
  component: FigButton,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["solid", "outline", "ghost", "soft"],
      description: "The visual style variant of the button",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
      description: "The size of the button",
    },
    color: {
      control: "select",
      options: [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "neutral",
      ],
      description: "The color theme of the button",
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
    },
    loading: {
      control: "boolean",
      description: "Whether the button is in a loading state",
    },
  },
  args: {
    variant: "solid",
    size: "md",
    color: "primary",
    disabled: false,
    loading: false,
  },
} satisfies Meta<typeof FigButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic button story
export const Default: Story = {
  args: {
    default: "Click me",
  },
};

// All variants
export const Variants: Story = {
  render: (args) => ({
    components: { FigButton },
    setup() {
      const variants = ["solid", "outline", "ghost", "soft"];
      return { args, variants };
    },
    template: `
      <div class="flex flex-wrap gap-4">
        <FigButton v-for="variant in variants" :key="variant" v-bind="args" :variant="variant">
          {{ variant }}
        </FigButton>
      </div>
    `,
  }),
};

// All sizes
export const Sizes: Story = {
  render: (args) => ({
    components: { FigButton },
    setup() {
      const sizes = ["xs", "sm", "md", "lg", "xl"];
      return { args, sizes };
    },
    template: `
      <div class="flex flex-wrap items-center gap-4">
        <FigButton v-for="size in sizes" :key="size" v-bind="args" :size="size">
          Size {{ size }}
        </FigButton>
      </div>
    `,
  }),
};

// All colors
export const Colors: Story = {
  render: (args) => ({
    components: { FigButton },
    setup() {
      const colors = [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "neutral",
      ];
      return { args, colors };
    },
    template: `
      <div class="flex flex-wrap gap-4">
        <FigButton v-for="color in colors" :key="color" v-bind="args" :color="color">
          {{ color }}
        </FigButton>
      </div>
    `,
  }),
};

// Loading state
export const Loading: Story = {
  args: {
    loading: true,
    default: "Loading...",
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    disabled: true,
    default: "Disabled",
  },
};

// With icons (example with slots)
export const WithIcons: Story = {
  render: (args) => ({
    components: { FigButton },
    setup() {
      return { args };
    },
    template: `
      <div class="flex flex-wrap gap-4">
        <FigButton v-bind="args">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Item
        </FigButton>
        <FigButton v-bind="args">
          Delete
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </FigButton>
      </div>
    `,
  }),
};
