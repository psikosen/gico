/**
 * Tauri Bridge
 * 
 * Provides proper access to Tauri APIs while working around import issues
 */

// Safely get the invoke function from the Tauri runtime
export function getTauriInvoke() {
    if (window.__TAURI__ && window.__TAURI__.core) {
        return window.__TAURI__.core.invoke;
    }
    
    // Fallback for when not running in Tauri
    console.warn('Tauri API not detected, using mock implementation');
    return mockInvoke;
}

// Mock implementation for when not running in Tauri
async function mockInvoke(command, params = {}) {
    console.warn(`Mock invoke called for command: ${command}`);
    console.warn('Please run the application in Tauri environment for full functionality');
    
    // Return minimal mock responses to prevent errors
    switch (command) {
        case 'create_table':
            return { success: true };
        case 'read_query':
            return [];
        case 'write_query':
            return { lastInsertRowid: 1 };
        case 'list_tables':
            return ['Conversations', 'Messages', 'Tags', 'ConversationLinks', 'Settings'];
        default:
            return null;
    }
}

// Export the invoke function for use throughout the app
export const invoke = getTauriInvoke();
