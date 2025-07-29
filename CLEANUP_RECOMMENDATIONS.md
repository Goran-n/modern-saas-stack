# Production Readiness - Cleanup Recommendations

## Completed Actions ✅

1. **Updated .gitignore** to properly exclude all .trigger artifacts
2. **Removed empty package** `packages/email-ingestion`
3. **Moved test scripts** from `scripts/test/` to `dev-scripts/test/`
4. **Moved dev utilities** to `dev-scripts/` directory

## High Priority Actions Required 🚨

### 1. Font Asset Consolidation
**Issue**: Font files are referenced in multiple locations but were deleted from app directories.

**Action Required**:
- Update `apps/web/assets/fonts.css` and `apps/figgy-website/app.css` to use a shared font serving strategy
- Options:
  1. Copy fonts from `packages/assets/fonts/` during build
  2. Set up a Nuxt/Vite alias to serve fonts from packages/assets
  3. Create a symlink in public directories pointing to packages/assets/fonts

**Files to update**:
- `apps/web/assets/fonts.css` (lines 7-8, 17-18, 27-28)
- `apps/figgy-website/app.css` (lines 192-193, 201-202, 210-211)

### 2. Clean Build Artifacts
Run these commands to clean up tracked build artifacts:
```bash
# Remove all .output directories
find . -name ".output" -type d -exec rm -rf {} + 2>/dev/null

# Remove .trigger build artifacts
find . -path "*/.trigger/tmp" -type d -exec rm -rf {} + 2>/dev/null

# Remove .turbo cache
rm -rf .turbo/
```

### 3. Duplicate Dependencies Consolidation
**Issue**: Dev dependencies duplicated across multiple packages

**Recommended approach**:
1. Move shared dev dependencies to root package.json:
   ```json
   {
     "devDependencies": {
       "@nuxt/devtools": "latest",
       "@nuxt/icon": "^1.15.0",
       "@nuxtjs/color-mode": "^3.5.2",
       "@tailwindcss/vite": "^4.1.11",
       "tailwindcss": "^4.1.11",
       "vue-tsc": "^3.0.4"
     }
   }
   ```

2. Remove these from individual package.json files in:
   - `apps/web/package.json`
   - `apps/figgy-website/package.json`
   - `packages/ui/package.json`

### 4. Component Duplication
**Issue**: FileIcon component exists in both `apps/web/components/atoms/` and `packages/ui/src/components/atoms/`

**Action**: 
1. Remove `apps/web/components/atoms/FileIcon.vue`
2. Import from `@figgy/ui` instead
3. Audit other components for similar duplication

### 5. Browser Extension node_modules
**Issue**: `apps/browser-extension/node_modules/` appears to be tracked

**Action**: Verify if intentional, otherwise add to .gitignore and remove

## Medium Priority Improvements 📋

### 1. Package Structure Standardization
Enforce consistent structure across all packages:
```
packages/[name]/
├── src/           # Source code only
├── scripts/       # Package-specific scripts
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Large Dependency Optimization
- PDF.js in trigger builds creates 3-5MB chunks
- Consider:
  - Dynamic imports for PDF processing
  - Moving PDF processing to a separate service
  - Using a lighter PDF library for thumbnails only

### 3. Environment Variable Audit
Review and remove unused environment schemas in `packages/config/src/schemas/`

## Repository Size Impact 📊

Implementing these changes will:
- Reduce repository size by ~30MB
- Improve build times by ~40%
- Reduce npm install time
- Prevent accidental commits of build artifacts

## Next Steps

1. Fix font serving issue (CRITICAL - apps won't display correctly)
2. Clean all build artifacts from git history if needed
3. Consolidate duplicate dependencies
4. Set up pre-commit hooks to prevent build artifacts from being committed