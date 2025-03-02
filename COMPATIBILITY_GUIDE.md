# GICO Compatibility Mode Guide

## Overview

GICO now includes a compatibility layer that allows the application to run in a standard web browser without the Tauri runtime. This makes development and testing much easier, while ensuring the app can still function normally when packaged with Tauri for distribution.

## Key Features

1. **Browser Compatibility**: The app now works in any modern web browser, not just within the Tauri environment.
2. **In-Memory Database**: When running in a browser, the app uses an in-memory database instead of SQLite.
3. **Enhanced Logging**: Comprehensive logging has been added throughout the application.
4. **Automatic Issue Detection**: The app can detect and attempt to fix common issues automatically.
5. **Test Data**: Sample conversations are generated automatically in browser mode.

## How to Use

### Running in Browser Mode

Simply open the `index.html` file in a web browser. The app will automatically detect that it's not running in Tauri and will:

1. Initialize an in-memory database
2. Create test conversations and messages
3. Enable debugging features

### Debugging Tools

The following debugging functions are available in the browser console:

- `window.runDiagnostics()` - Run all diagnostics to check for issues
- `window.attemptFixes()` - Attempt to automatically fix common issues
- `window.inMemoryDb` - Examine the current state of the in-memory database
- `window.diagnoseSendButton()` - Run diagnostics specifically on the send button
- `window.GICO_DEBUG_MODE = true` - Enable additional debugging features

### Common Issues Fixed

1. **Module Import Errors**: The app no longer fails when Tauri modules can't be imported.
2. **Database Operations**: All database operations now work in both Tauri and browser environments.
3. **Button Issues**: Enhanced button state management with automatic recovery.
4. **Event Listener Problems**: Event listeners are verified and reattached if missing.

## Technical Details

### Compatibility Layer

The Tauri compatibility layer (`tauri-compat.js`) provides:

- Mock implementations of Tauri's invoke function
- In-memory database for conversations, messages, and settings
- API key storage and retrieval
- Automatic error handling for Tauri-specific features

### Runtime Detection

The app detects whether it's running in a Tauri environment or a browser:

```javascript
try {
    await import('@tauri-apps/api');
    // Running in Tauri environment
} catch (e) {
    // Running in browser environment
}
```

## Next Steps

1. Continue using the compatibility mode for development
2. Package the app with Tauri when ready for distribution
3. All changes made are compatible with both environments
