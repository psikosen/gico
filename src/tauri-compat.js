/**
 * Tauri Compatibility Layer
 * 
 * Provides fallback implementations of Tauri APIs when running outside the Tauri environment
 * This allows the app to function in a regular browser context for testing and development
 */

// In-memory database for fallback storage
const inMemoryDb = {
    tables: {},
    settings: {},
    lastId: 0
};

// Detect if we're running in Tauri environment
export async function isTauriAvailable() {
    try {
        
        // Attempt to import the Tauri API
        const tauri = await import('@tauri-apps/api');
        return true;
    } catch (error) {
        console.warn('Tauri API not available, using compatibility mode');
        return false;
    }
}

// Safe invoke function that falls back to in-memory operations
export async function safeInvoke(command, params = {}) {
    try {
        // First try to use the real Tauri invoke if available
        try {
            const { invoke } = await import('@tauri-apps/api');
            return await invoke(command, params);
        } catch (importError) {
            // If Tauri API is not available, use our mock implementation
            return await mockInvoke(command, params);
        }
    } catch (error) {
        console.error(`Error in safeInvoke(${command}):`, error);
        throw error;
    }
}

// Mock implementation of Tauri's invoke function
async function mockInvoke(command, params = {}) {
    console.debug(`Mock invoke: ${command}`, params);
    
    switch (command) {
        case 'create_table':
            return handleCreateTable(params);
        case 'read_query':
            return handleReadQuery(params);
        case 'write_query':
            return handleWriteQuery(params);
        case 'list_tables':
            return Object.keys(inMemoryDb.tables);
        case 'describe_table':
            return handleDescribeTable(params);
        default:
            console.warn(`Unknown command in mock invoke: ${command}`);
            return null;
    }
}

// Handle create_table command
function handleCreateTable(params) {
    const { query } = params;
    
    // Very basic SQL parser to extract table name
    const tableNameMatch = query.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i);
    if (tableNameMatch && tableNameMatch[1]) {
        const tableName = tableNameMatch[1];
        if (!inMemoryDb.tables[tableName]) {
            inMemoryDb.tables[tableName] = [];
            console.debug(`Created in-memory table: ${tableName}`);
        }
        return { success: true };
    }
    
    console.warn('Failed to parse CREATE TABLE statement', query);
    return { success: false };
}

// Handle read_query command
function handleReadQuery(params) {
    const { query, parameters = [] } = params;
    
    // Basic SQL parsing for SELECT statements
    if (query.trim().toUpperCase().startsWith('SELECT')) {
        // Extract table name - very simplified
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        if (!fromMatch || !fromMatch[1]) {
            console.warn('Failed to parse table name in SELECT query', query);
            return [];
        }
        
        const tableName = fromMatch[1];
        const table = inMemoryDb.tables[tableName] || [];
        
        // Extract WHERE conditions - extremely simplified
        const whereMatch = query.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && whereMatch[1] && parameters.length > 0) {
            const fieldName = whereMatch[1];
            const value = parameters[0];
            
            return table.filter(row => String(row[fieldName]) === String(value));
        }
        
        // Handle special case for Settings table
        if (tableName === 'Settings' && query.includes('gemini_api_key')) {
            if (inMemoryDb.settings.gemini_api_key) {
                return [{ value: inMemoryDb.settings.gemini_api_key }];
            }
            return [];
        }
        
        // If no WHERE clause or more complex query, return all rows
        return table;
    }
    
    console.warn('Unsupported query type in read_query', query);
    return [];
}

// Handle write_query command
function handleWriteQuery(params) {
    const { query, parameters = [] } = params;
    
    // Handle INSERT statements
    if (query.trim().toUpperCase().startsWith('INSERT')) {
        // Extract table name - simplified
        const intoMatch = query.match(/INTO\s+(\w+)/i);
        if (!intoMatch || !intoMatch[1]) {
            console.warn('Failed to parse table name in INSERT query', query);
            return { success: false };
        }
        
        const tableName = intoMatch[1];
        if (!inMemoryDb.tables[tableName]) {
            inMemoryDb.tables[tableName] = [];
        }
        
        // Handle Settings table specially
        if (tableName === 'Settings' && parameters.length >= 2) {
            const key = parameters[0];
            const value = parameters[1];
            inMemoryDb.settings[key] = value;
            console.debug(`Stored setting: ${key} = ${value}`);
            return { success: true };
        }
        
        // For regular tables, create a new row with an ID
        inMemoryDb.lastId++;
        const id = inMemoryDb.lastId;
        
        // Create a basic row object
        const row = { id };
        
        // For Conversations table, add title and timestamps
        if (tableName === 'Conversations' && parameters.length > 0) {
            row.title = parameters[0];
            row.created_at = new Date().toISOString();
            row.updated_at = new Date().toISOString();
            row.bookmarked = 0;
        }
        
        // For Messages table
        if (tableName === 'Messages' && parameters.length >= 3) {
            row.conversation_id = parseInt(parameters[0]);
            row.sender = parameters[1];
            row.text = parameters[2];
            row.timestamp = new Date().toISOString();
        }
        
        // Add the row to the table
        inMemoryDb.tables[tableName].push(row);
        console.debug(`Added row to ${tableName}, ID: ${id}`);
        
        return {
            lastInsertRowid: id,
            success: true
        };
    }
    
    // Handle UPDATE statements - extremely simplified
    if (query.trim().toUpperCase().startsWith('UPDATE')) {
        // Extract table name
        const updateMatch = query.match(/UPDATE\s+(\w+)/i);
        if (!updateMatch || !updateMatch[1]) {
            console.warn('Failed to parse table name in UPDATE query', query);
            return { success: false };
        }
        
        const tableName = updateMatch[1];
        if (!inMemoryDb.tables[tableName]) {
            console.warn(`Table ${tableName} does not exist for UPDATE`);
            return { success: false };
        }
        
        // For now just log that we would update something
        console.debug(`Mock UPDATE on ${tableName} with params:`, parameters);
        return { success: true, rowsAffected: 1 };
    }
    
    console.warn('Unsupported query type in write_query', query);
    return { success: false };
}

// Handle describe_table command
function handleDescribeTable(params) {
    const { table_name } = params;
    
    if (inMemoryDb.tables[table_name]) {
        // Return a simple schema based on the first row if available
        const table = inMemoryDb.tables[table_name];
        if (table.length > 0) {
            const firstRow = table[0];
            return Object.keys(firstRow).map(column => ({
                name: column,
                type: typeof firstRow[column] === 'number' ? 'INTEGER' : 'TEXT'
            }));
        }
        
        // Default schema if table is empty
        return [
            { name: 'id', type: 'INTEGER' }
        ];
    }
    
    console.warn(`Table ${table_name} not found for describe_table`);
    return [];
}

// Initialize default data for testing
export function initializeTestData() {
    console.debug('Initializing test data for Tauri compatibility mode');
    
    // Create test conversation
    if (!inMemoryDb.tables['Conversations']) {
        inMemoryDb.tables['Conversations'] = [];
    }
    
    const conversationId = inMemoryDb.lastId + 1;
    inMemoryDb.tables['Conversations'].push({
        id: conversationId,
        title: 'Test Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        bookmarked: 0
    });
    inMemoryDb.lastId = conversationId;
    
    // Create test message
    if (!inMemoryDb.tables['Messages']) {
        inMemoryDb.tables['Messages'] = [];
    }
    
    const messageId = inMemoryDb.lastId + 1;
    inMemoryDb.tables['Messages'].push({
        id: messageId,
        conversation_id: conversationId,
        sender: 'system',
        text: 'Welcome to the test conversation! The app is running in compatibility mode without Tauri.',
        timestamp: new Date().toISOString()
    });
    inMemoryDb.lastId = messageId;
    
    console.debug('Test data initialized', inMemoryDb);
}

// Export entire memory DB for debugging
export function getInMemoryDb() {
    return inMemoryDb;
}

// Make it available globally for debugging
window.inMemoryDb = inMemoryDb;
