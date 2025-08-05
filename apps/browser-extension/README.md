# Figgy Browser Extension

A minimal Chrome/Firefox extension that enables drag-and-drop file transfer from Figgy to Xero.

## Core Functionality

The extension does ONE thing: allows users to drag files from Figgy and drop them into Xero's file upload areas.

## Architecture

### Structure
```
src/
├── config/
│   └── env.ts          # Environment configuration
├── entrypoints/
│   ├── background.ts   # Background service worker
│   ├── content-figgy.ts # Detects file drags on Figgy
│   ├── content-xero.ts  # Handles file drops on Xero
│   └── popup/          # Minimal status popup
├── types/
│   └── messages.ts     # Message type definitions
└── utils/
    ├── config.ts       # Config management
    ├── logger.ts       # Simple logging
    └── messaging.ts    # Message passing utilities
```

### Message Flow
1. User drags a file on Figgy
2. `content-figgy.ts` detects the drag and notifies background
3. User drops the file on Xero
4. `content-xero.ts` requests the file from background
5. `background.ts` fetches the file from Figgy API
6. File is delivered to Xero and uploaded

## Development

### Environment Setup

The browser extension uses the same Doppler configuration as the main project (`figgy-be`).

Make sure you have Doppler set up:
```bash
doppler setup  # Select figgy-be project
```

Required environment variables (managed through Doppler):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_API_URL` - API endpoint URL
- `VITE_APP_URL` - Web app URL

### Commands

```bash
# Development (with Doppler)
bun run dev

# Build for production
bun run build

# Type checking
bun run typecheck

# Clean build artifacts
bun run clean
```

### Testing

1. Run `bun run dev` to start development mode
2. Load the extension from `.output/chrome-mv3` in Chrome
3. Navigate to Figgy and Xero in separate tabs
4. Drag a file from Figgy and drop it on a file upload area in Xero

## Production Build

```bash
# Build with Doppler
bun run build

# Or build with local env
VITE_SUPABASE_URL=xxx VITE_SUPABASE_ANON_KEY=xxx bun run build:local
```

The production build will be in `.output/chrome-mv3` (for Chrome) or `.output/firefox-mv2` (for Firefox).

## Key Design Decisions

1. **Minimal Scope**: Only handles file drag-drop, nothing else
2. **No Auth Management**: Uses existing session from Figgy web app
3. **Simple Message Protocol**: Direct request-response pattern
4. **Environment Variables**: Proper separation of dev/prod configs
5. **TypeScript**: Full type safety for messages and configs