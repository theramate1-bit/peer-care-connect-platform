# React Runtime Duplication Fix

**Date:** 2025-02-24  
**Issue:** React "Objects are not valid as a React child" error  
**Root Cause:** Multiple React runtime instances causing hook call failures  
**Status:** ✅ Fixed

## Problem Description

The application was experiencing a critical React error:

```
Error: Objects are not valid as a React child (found: object with keys {$$typeof, type, key, props, _owner, _store}).
If you meant to render a collection of children, use an array instead.
```

This error was occurring in the `react-helmet-async` library's `HelmetProvider` component (`_a` internal component), but the root cause was actually **multiple React runtime instances** being loaded, which caused:

1. Invalid hook calls (`Cannot read properties of null (reading 'useRef')`)
2. React element validation failures
3. Component reconciliation issues

## Root Cause Analysis

The issue was caused by Vite's dependency optimization creating multiple instances of React:

1. **Vite Dependency Optimization**: Vite was bundling React multiple times across different dependency chunks
2. **Missing Deduplication**: The `vite.config.ts` was missing explicit deduplication for React packages
3. **Aggressive ESBuild Configuration**: An overly broad `esbuild.include` pattern was transforming dependencies that shouldn't be transformed

## Solution

### 1. Vite Configuration Fix

Updated `vite.config.ts` to ensure a single React runtime:

```typescript
export default defineConfig({
  resolve: {
    // Force deduplication of React packages
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Explicitly include React packages in optimization
    include: ["react", "react-dom", "react/jsx-runtime"],
  },
  // Removed aggressive esbuild configuration that was causing issues
});
```

**Key Changes:**

- Added `resolve.dedupe` to force Vite to use a single instance of React packages
- Added `react/jsx-runtime` to both dedupe and optimizeDeps
- Removed the problematic `esbuild` configuration that was transforming too broadly

### 2. Removed react-helmet-async Dependency

Replaced `react-helmet-async` with a native `useEffect`-based solution to eliminate the problematic dependency:

**Before:**

```tsx
import { HelmetProvider } from "react-helmet-async";
import { Helmet } from "react-helmet-async";

<HelmetProvider>
  <Helmet>
    <title>Page Title</title>
  </Helmet>
</HelmetProvider>;
```

**After:**

```tsx
// MetaTags.tsx - Native implementation using useEffect
import { useEffect, useMemo } from 'react';

const MetaTags = ({ title, description, ... }) => {
  useEffect(() => {
    document.title = title;
    // Direct DOM manipulation for meta tags
    // ...
  }, [title, description, ...]);

  return null;
};
```

### 3. Updated App.tsx

Removed `HelmetProvider` wrapper from the app root:

```tsx
// Before
<HelmetProvider>
  <BrowserRouter>
    {/* app content */}
  </BrowserRouter>
</HelmetProvider>

// After
<BrowserRouter>
  {/* app content */}
</BrowserRouter>
```

## Files Modified

1. **`vite.config.ts`**
   - Added `resolve.dedupe` for React packages
   - Updated `optimizeDeps.include` to include `react/jsx-runtime`
   - Removed problematic `esbuild` configuration

2. **`src/App.tsx`**
   - Removed `HelmetProvider` import and wrapper
   - Simplified component tree

3. **`src/components/SEO/MetaTags.tsx`**
   - Replaced `react-helmet-async` with native `useEffect` implementation
   - Added safe string conversion to prevent React element injection
   - Direct DOM manipulation for meta tags

4. **`src/main.tsx`**
   - Cleaned up debug logging (removed temporary debugging code)

5. **`src/components/ErrorBoundary.tsx`**
   - Cleaned up debug logging (removed temporary debugging code)

## Verification

After applying the fix:

✅ No more "Objects are not valid as a React child" errors  
✅ No more "Invalid hook call" errors  
✅ Application loads and renders correctly  
✅ Meta tags update properly via native implementation  
✅ Single React runtime instance confirmed

## Prevention

To prevent this issue in the future:

1. **Always dedupe React packages in Vite config:**

   ```typescript
   resolve: {
     dedupe: ["react", "react-dom", "react/jsx-runtime"],
   }
   ```

2. **Include React in optimizeDeps:**

   ```typescript
   optimizeDeps: {
     include: ['react', 'react-dom', 'react/jsx-runtime'],
   }
   ```

3. **Avoid aggressive esbuild transforms** that might duplicate dependencies

4. **Monitor for multiple React instances:**
   ```javascript
   // In browser console
   console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.size);
   // Should be 1, not more
   ```

## Related Issues

- React Error #300: "Objects are not valid as a React child"
- Invalid hook call errors
- Component reconciliation failures
- `react-helmet-async` compatibility issues with Vite

## References

- [Vite Dependency Pre-bundling](https://vitejs.dev/guide/dep-pre-bundling.html)
- [React Multiple Instances](https://react.dev/warnings/invalid-hook-call-warning#duplicate-react)
- [Vite resolve.dedupe](https://vitejs.dev/config/shared-options.html#resolve-dedupe)

---

**Last Updated:** 2025-02-24  
**Fixed By:** AI Assistant  
**Tested:** ✅ Verified working in development environment
