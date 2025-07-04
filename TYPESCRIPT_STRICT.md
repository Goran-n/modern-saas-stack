# 🚨 STRICT TYPESCRIPT ENFORCEMENT

This monorepo enforces **ZERO TypeScript errors** across all packages. No code will run if there are any TypeScript errors.

## 🔒 Enforcement Levels

### 1. **Development Commands**
All dev commands now validate TypeScript first:
```bash
# These will fail if ANY TypeScript errors exist
turbo dev           # Runs typecheck before starting dev servers  
bun run dev:api     # API dev with validation
bun run dev:web     # Web dev with validation
```

### 2. **Script Execution** 
Direct script execution is now protected:
```bash
# ❌ DANGEROUS - Bypasses validation
bun run src/scripts/my-script.ts

# ✅ SAFE - Validates TypeScript first
bun run script:api src/scripts/my-script.ts
bun run script:safe src/scripts/my-script.ts
```

### 3. **Build Pipeline**
```bash
turbo build         # Validates TypeScript in all packages
bun run build:api   # API build with validation
bun run build:web   # Web build with validation
```

### 4. **Git Commits**
Pre-commit hooks prevent commits with TypeScript errors:
```bash
git commit -m "feat: add feature"  # Will fail if TypeScript errors exist
```

## 🛠️ Validation Commands

### Quick Validation
```bash
bun run typecheck:strict    # Validates entire monorepo
turbo typecheck            # Validates using turbo pipeline
```

### Package-Specific Validation
```bash
# API only
cd apps/api && bun run validate:types

# Web only  
cd apps/web && bun run typecheck
```

## 🎯 Best Practices

### 1. **Fix Before Code**
Always fix TypeScript errors before writing new code:
```bash
bun run typecheck:strict
# Fix any errors shown
# Then continue development
```

### 2. **Use Safe Script Runners**
```bash
# Instead of:
doppler run -- bun run src/scripts/direct-xero-sync.ts

# Use:
bun run script:api src/scripts/direct-xero-sync.ts
```

### 3. **Continuous Validation**
```bash
# Watch mode for development
cd apps/web && bun run typecheck:watch
```

## 🚫 What's Blocked

The following will **FAIL** if TypeScript errors exist:
- ✋ Development server startup
- ✋ Build processes  
- ✋ Script execution (when using safe runners)
- ✋ Git commits
- ✋ CI/CD pipelines

## 🔧 Emergency Override

If you absolutely need to bypass validation (NOT RECOMMENDED):
```bash
# Direct bun execution (use with extreme caution)
cd apps/api && doppler run -- bun src/scripts/my-script.ts
```

**⚠️ Warning**: This bypasses all safety checks and should only be used in emergencies.

## 📊 Validation Results

The strict validator provides detailed feedback:
```
🔍 Running STRICT TypeScript validation across entire monorepo...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Validating @kibly/api...
✅ @kibly/api - TypeScript validation PASSED

📦 Validating @kibly/web...  
❌ @kibly/web - TypeScript validation FAILED

📋 Errors in @kibly/web:
src/stores/integration.ts(265,11): error TS2322: Type 'null' is not assignable...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 VALIDATION SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PASS @kibly/api
❌ FAIL @kibly/web

🚨 STRICT VALIDATION FAILED
❌ Code execution is BLOCKED due to TypeScript errors
🔧 Fix all errors above before running any code
```

## 🎉 Success State

When all packages pass validation:
```
🎉 STRICT VALIDATION PASSED
✅ All packages have zero TypeScript errors  
🚀 Code execution is allowed
```

This ensures **100% TypeScript compliance** across the entire codebase.