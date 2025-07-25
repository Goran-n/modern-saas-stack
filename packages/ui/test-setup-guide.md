# Test Setup Guide for @figgy/ui

## 1. Install Test Dependencies

```bash
cd packages/ui
npm install --save-dev @testing-library/vue @testing-library/jest-dom @testing-library/user-event happy-dom @vue/test-utils c8
```

## 2. Configure Vitest

Create `packages/ui/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.stories.ts',
        'src/**/types.ts',
        'src/**/index.ts',
        'src/tests/**/*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

## 3. Create Test Setup File

Create `packages/ui/src/tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
```

## 4. Example Component Tests

### Button Component Test

Create `packages/ui/src/components/atoms/Button/Button.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Button from './Button.vue';

describe('Button', () => {
  it('renders with text', () => {
    render(Button, {
      slots: {
        default: 'Click me',
      },
    });
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(Button, {
      props: { variant: 'primary' },
    });
    
    expect(screen.getByRole('button')).toHaveClass('bg-primary-500');
    
    rerender({ variant: 'secondary' });
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-500');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(Button, {
      props: { onClick: handleClick },
      slots: { default: 'Click me' },
    });
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    render(Button, {
      props: { loading: true },
    });
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(Button, {
      props: { disabled: true },
    });
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as link when href is provided', () => {
    render(Button, {
      props: { 
        href: 'https://example.com',
        target: '_blank',
      },
      slots: { default: 'Link' },
    });
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
```

### Input Component Test

Create `packages/ui/src/components/atoms/Input/Input.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Input from './Input.vue';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(Input, {
      props: {
        placeholder: 'Enter text',
      },
    });
    
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('updates modelValue on input', async () => {
    const { emitted } = render(Input, {
      props: {
        modelValue: '',
      },
    });
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello');
    
    expect(emitted()['update:modelValue']).toEqual([
      ['H'], ['He'], ['Hel'], ['Hell'], ['Hello']
    ]);
  });

  it('shows clear button when clearable and has value', async () => {
    const { rerender } = render(Input, {
      props: {
        modelValue: 'test',
        clearable: true,
      },
    });
    
    expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
    
    await rerender({ modelValue: '' });
    expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();
  });

  it('clears input when clear button clicked', async () => {
    const { emitted } = render(Input, {
      props: {
        modelValue: 'test',
        clearable: true,
      },
    });
    
    await userEvent.click(screen.getByLabelText('Clear input'));
    
    expect(emitted()['update:modelValue']).toEqual([['']]);
  });

  it('applies error styles when error prop is true', () => {
    render(Input, {
      props: {
        error: true,
      },
    });
    
    expect(screen.getByRole('textbox')).toHaveClass('border-error-500');
  });

  it('is disabled when disabled prop is true', () => {
    render(Input, {
      props: {
        disabled: true,
      },
    });
    
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
```

### Accessibility Test Example

Create `packages/ui/src/components/atoms/Modal/Modal.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/vue';
import { axe, toHaveNoViolations } from 'jest-axe';
import Modal from './Modal.vue';

expect.extend(toHaveNoViolations);

describe('Modal Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(Modal, {
      props: {
        modelValue: true,
        title: 'Test Modal',
      },
      slots: {
        default: 'Modal content',
      },
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('traps focus within modal', async () => {
    render(Modal, {
      props: {
        modelValue: true,
        title: 'Test Modal',
      },
      slots: {
        default: '<button>First</button><button>Second</button>',
      },
    });
    
    const firstButton = screen.getByText('First');
    const secondButton = screen.getByText('Second');
    const closeButton = screen.getByLabelText('Close modal');
    
    // Focus should be on close button initially
    expect(document.activeElement).toBe(closeButton);
    
    // Tab to first button
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(firstButton);
    
    // Tab to second button
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(secondButton);
    
    // Tab should wrap to close button
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);
  });

  it('closes on Escape key', async () => {
    const { emitted } = render(Modal, {
      props: {
        modelValue: true,
      },
    });
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(emitted()['update:modelValue']).toEqual([[false]]);
  });
});
```

## 5. Test Utilities

Create `packages/ui/src/tests/utils.ts`:

```typescript
import { render as tlRender, RenderOptions } from '@testing-library/vue';
import { Component } from 'vue';

// Custom render function that includes common providers
export function render(
  component: Component,
  options?: RenderOptions
) {
  return tlRender(component, {
    ...options,
    global: {
      ...options?.global,
      stubs: {
        teleport: true,
        ...options?.global?.stubs,
      },
    },
  });
}

// Helper to test component variants
export function testVariants<T extends string>(
  Component: Component,
  variants: T[],
  getExpectedClass: (variant: T) => string
) {
  describe('variants', () => {
    variants.forEach((variant) => {
      it(`renders ${variant} variant correctly`, () => {
        const { container } = render(Component, {
          props: { variant },
        });
        
        const element = container.firstElementChild;
        expect(element).toHaveClass(getExpectedClass(variant));
      });
    });
  });
}
```

## 6. Add Test Scripts

Update `packages/ui/package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest watch"
  }
}
```

## 7. GitHub Actions CI

Create `.github/workflows/test-ui.yml`:

```yaml
name: Test UI Package

on:
  push:
    paths:
      - 'packages/ui/**'
      - '.github/workflows/test-ui.yml'
  pull_request:
    paths:
      - 'packages/ui/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test:coverage
        working-directory: packages/ui
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: packages/ui/coverage
          flags: ui
```

## Testing Best Practices

1. **Test user behaviour, not implementation details**
2. **Use semantic queries** (getByRole, getByLabelText)
3. **Test accessibility** with jest-axe
4. **Mock external dependencies** properly
5. **Aim for 80%+ coverage** but focus on critical paths
6. **Test error states** and edge cases
7. **Use data-testid sparingly** as last resort