# GigLedger Docker Icon Sizing Issue Resolution

## Problem
Icons in the navigation bar were rendering at incorrect sizes (too large) in the Docker deployment of GigLedger. This made the navigation unusable as icons would dominate the screen.

## Root Cause
The issue was caused by Tailwind CSS not properly processing the utility classes used for icon sizing (`w-4`, `h-4`, `w-5`, `h-5`, `w-6`, `h-6`) in the Docker environment. This happened because:

1. The Tailwind configuration used glob patterns (`"./src/**/*.{js,ts,jsx,tsx}"`) that weren't being properly interpreted within the Docker build context
2. This resulted in Tailwind not detecting the utility classes in use, so they were purged during the CSS optimization process

## Solution
Updated the `tailwind.config.js` file to use explicit file paths instead of glob patterns:

```javascript
content: [
  "./index.html",
  "./src/App.jsx",
  "./src/components/NavBar.jsx",
  "./src/pages/*.jsx",
  "./src/components/**/*.jsx"
]
```

This ensures that Tailwind properly scans the relevant files during the Docker build process, detecting all the icon sizing classes used in the NavBar component.

## Files Modified
- `tailwind.config.js` - Updated content paths for better Docker compatibility

## Verification
After rebuilding the Docker container:
1. CSS file now contains the icon sizing classes (`w-4`, `h-4`, `w-5`, `h-5`, `w-6`, `h-6`)
2. Application properly serves the updated CSS file
3. Navigation icons render at appropriate sizes on both desktop and mobile views

## Key Learning
When deploying applications with Tailwind CSS in Docker environments, it's important to ensure file paths in the configuration are compatible with the container's file system and shell environment. Explicit paths can be more reliable than glob patterns in some Docker contexts.