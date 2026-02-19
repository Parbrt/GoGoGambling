# GoGoGambling - Agent Guidelines

## Project Overview
React 19 + TypeScript 5 + Vite + Tailwind CSS v4 + Supabase gambling game application.

## Build & Development Commands

```bash
# Development
npm run dev                 # Start Vite dev server

# Production
npm run build              # Full build (tsc + vite)
npm run preview            # Preview production build locally

# Linting
npm run lint               # Run ESLint on all files
```

**Note**: No test framework is currently installed. If adding tests, consider Vitest (aligns with Vite).

## Code Style Guidelines

### TypeScript Configuration
- Strict mode enabled (`strict: true`)
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx transform
- `noUnusedLocals: true` - Remove unused variables
- `noUnusedParameters: true` - Remove unused function parameters

### Imports & Exports
```typescript
// Type imports must use explicit `type` keyword
import type { PlayerType } from '../types';

// Regular imports
import { useState, useEffect } from "react";
import { supabase } from '../lib/supabase';

// Component exports: use named exports for components
export function ComponentName() { }

// Default exports allowed for page components
export default function PageComponent() { }
```

### Naming Conventions
- **Components**: PascalCase (e.g., `DailyReward`, `PlayersList`)
- **Functions**: camelCase (e.g., `getPlayerByUserId`, `handleLogin`)
- **Types/Interfaces**: PascalCase with suffix (e.g., `PlayerType`, `DailyRewardProps`)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Files**: PascalCase for components, camelCase for utilities

### String Formatting
- Use double quotes for string literals: `"example"`
- Use single quotes for imports from libs: `from '../lib/supabase'`
- Prefer template literals for interpolation

### Type Definitions
```typescript
// Define types in src/types.ts
export type PlayerType = {
  id: number
  player_name: string
  nb_point: number
  // ...
}

// Component props as interface
interface ComponentProps {
  userId: string;
  onRewardClaimed?: () => void;
}
```

### Error Handling Pattern
```typescript
// Supabase operations
try {
  const { data, error } = await supabase.from("table").select();
  if (error) {
    console.error('Descriptive error message:', error);
    throw error;
  }
  return data;
} catch (err) {
  console.error('Context message:', err);
  // Re-throw or handle appropriately
}
```

### Styling (Tailwind CSS v4)
- Use Tailwind utility classes exclusively
- Custom CSS in `src/index.css` with `@import "tailwindcss"`
- Common patterns:
  - Cards: `bg-white rounded-xl shadow-lg`
  - Buttons: `bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded`
  - Layout: `flex items-center justify-center`

### React Patterns
- Functional components with hooks
- Props destructuring in parameters
- `useEffect` for data fetching
- Callback functions prefixed with `handle` (e.g., `handleClick`)
- Async functions prefixed with action verb (e.g., `loadData`, `fetchUser`)

### File Organization
```
src/
├── components/       # React components (PascalCase files)
├── lib/             # Utilities & external clients (camelCase)
├── types.ts         # Global TypeScript types
└── assets/          # Static assets
```

### Language Standardization
- **Code**: English (variables, functions, comments)
- **UI/UX**: French (user-facing text)
- **Git commits**: English preferred

### Pre-commit Checklist
1. Run `npm run build` - must pass without errors
2. Run `npm run lint` - must pass without errors
3. Check for unused imports (TypeScript strict mode catches these)
4. Verify no `console.log` left in production code (keep `console.error` for errors)

### Environment Variables
- Use `import.meta.env.VITE_*` for Vite env vars
- Never commit `.env` file
- Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

### ESLint Rules
- TypeScript recommended config
- React Hooks rules (exhaustive-deps enforced)
- React Refresh plugin
- No explicit `any` types (use `unknown` or proper typing)
