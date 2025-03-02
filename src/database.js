/**
 * Database Module - Handles all database operations with improved logging and error handling
 */
import { invoke } from './tauri-bridge.js';
import logger from './logger.js';

class Database {
    constructor() {
        logger.info('Database module initialized');
        this.isInitialized = false;
    }
    
    /**
     * Initialize the database with required tables
     */
    async initialize() {
        if (this.isInitialized) {
            logger.info('Database already initialized, skipping');
            return;
        } 
        
        logger.info('Initializing database schema');
        try {
            // Create Conversations table
            logger.debug('Creating Conversations table');
            await this.createTable(`
                CREATE TABLE IF NOT EXISTS Conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    bookmarked INTEGER DEFAULT 0
                )
            `);
            
            // Create Messages table
            logger.debug('Creating Messages table');
            await this.createTable(`
                CREATE TABLE IF NOT EXISTS Messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    sender TEXT NOT NULL,
                    text TEXT NOT NULL,
                    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE
                )
            `);
            
            // Create ConversationLinks table
            logger.debug('Creating ConversationLinks table');
            await this.createTable(`
                CREATE TABLE IF NOT EXISTS ConversationLinks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_conversation_id INTEGER NOT NULL,
                    target_conversation_id INTEGER NOT NULL,
                    FOREIGN KEY (source_conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
                    UNIQUE(source_conversation_id, target_conversation_id)
                )
            `);
            
            // Create Tags table
            logger.debug('Creating Tags table');
            await this.createTable(`
                CREATE TABLE IF NOT EXISTS Tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    conversation_id INTEGER NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
                    UNIQUE(name, conversation_id)
                )
            `);
            
            // Create TagLinks table for relationships between tags
            logger.debug('Creating TagLinks table');
            await this.createTable(`
                CREATE TABLE IF NOT EXISTS TagLinks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_tag_id INTEGER NOT NULL,
                    target_tag_id INTEGER NOT NULL,
                    FOREIGN KEY (source_tag_id) REFERENCES Tags(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_tag_id) REFERENCES Tags(id) ON DELETE CASCADE,
                    UNIQUE(source_tag_id, target_tag_id)
                )
            `);
            
            // Create Settings table for API keys and preferences
            logger.debug('Creating Settings table');
            await this.createTable(`
                CREATE TABLE IF NOT EXISTS Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `);
            
            this.isInitialized = true;
            logger.info('Database initialization completed successfully');
            
            // Verify tables exist
            const tables = await this.listTables();
            logger.info('Verified tables exist', { tables });
            
        } catch (error) {
            logger.logError('Failed to initialize database schema', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Create a database table
     * @param {string} query - SQL query to create table
     */
    async createTable(query) {
        try {
            logger.debug('Executing create table query', { query });
            const result = await invoke('create_table', { query });
            logger.debug('Create table query executed successfully');
            return result;
        } catch (error) {
            logger.logError('Failed to create table', error, { query });
            throw new Error(`Failed to create table: ${error.message}`);
        }
    }
    
    /**
     * Execute a read query
     * @param {string} query - SQL query to execute
     * @param {Array} parameters - Query parameters
     */
    async readQuery(query, parameters = []) {
        try {
            // Convert parameters to strings to match Rust expectations
            const stringParams = parameters.map(p => String(p));
            
            logger.debug('Executing read query', { 
                query,
                paramCount: parameters.length,
                params: parameters.length > 0 ? stringParams : 'none'
            });
            
            const result = await invoke('read_query', {
                query,
                parameters: parameters.length > 0 ? stringParams : undefined
            });
            
            logger.debug('Read query executed successfully', { 
                rowCount: result ? result.length : 0
            });
            
            return result;
        } catch (error) {
            logger.logError('Failed to execute read query', error, { 
                query, 
                parameters: parameters.length > 0 ? parameters : 'none'
            });
            throw new Error(`Failed to execute read query: ${error.message}`);
        }
    }
    
    /**
     * Execute a write query
     * @param {string} query - SQL query to execute
     * @param {Array} parameters - Query parameters
     */
    async writeQuery(query, parameters = []) {
        try {
            // Convert parameters to strings to match Rust expectations
            const stringParams = parameters.map(p => String(p));
            
            logger.debug('Executing write query', { 
                query,
                paramCount: parameters.length,
                params: parameters.length > 0 ? stringParams : 'none'
            });
            
            const result = await invoke('write_query', {
                query,
                parameters: parameters.length > 0 ? stringParams : undefined
            });
            
            logger.debug('Write query executed successfully', { result });
            return result;
        } catch (error) {
            logger.logError('Failed to execute write query', error, { 
                query, 
                parameters: parameters.length > 0 ? parameters : 'none'
            });
            throw new Error(`Failed to execute write query: ${error.message}`);
        }
    }
    
    /**
     * List all tables in the database
     */
    async listTables() {
        try {
            logger.debug('Listing tables');
            const tables = await invoke('list_tables');
            logger.debug('Tables retrieved successfully', { tables });
            return tables;
        } catch (error) {
            logger.logError('Failed to list tables', error);
            throw new Error(`Failed to list tables: ${error.message}`);
        }
    }
    
    /**
     * Describe a table schema
     * @param {string} tableName - Name of the table
     */
    async describeTable(tableName) {
        try {
            logger.debug(`Describing table schema for ${tableName}`);
            const schema = await invoke('describe_table', { table_name: tableName });
            logger.debug(`Schema for ${tableName} retrieved successfully`);
            return schema;
        } catch (error) {
            logger.logError(`Failed to describe table ${tableName}`, error);
            throw new Error(`Failed to describe table ${tableName}: ${error.message}`);
        }
    }
    
    /**
     * Begin a transaction
     */
    async beginTransaction() {
        try {
            logger.debug('Beginning transaction');
            await this.writeQuery('BEGIN TRANSACTION');
            logger.debug('Transaction started');
        } catch (error) {
            logger.logError('Failed to begin transaction', error);
            throw new Error(`Failed to begin transaction: ${error.message}`);
        }
    }
    
    /**
     * Commit a transaction
     */
    async commitTransaction() {
        try {
            logger.debug('Committing transaction');
            await this.writeQuery('COMMIT');
            logger.debug('Transaction committed');
        } catch (error) {
            logger.logError('Failed to commit transaction', error);
            throw new Error(`Failed to commit transaction: ${error.message}`);
        }
    }
    
    /**
     * Rollback a transaction
     */
    async rollbackTransaction() {
        try {
            logger.debug('Rolling back transaction');
            await this.writeQuery('ROLLBACK');
            logger.debug('Transaction rolled back');
        } catch (error) {
            logger.logError('Failed to rollback transaction', error);
            throw new Error(`Failed to rollback transaction: ${error.message}`);
        }
    }
    
    /**
     * Create a new conversation
     * @param {string} title - Conversation title
     */
    async createConversation(title) {
        try {
            logger.info('Creating new conversation', { title });
            
            const result = await this.writeQuery(`
                INSERT INTO Conversations (title, created_at, updated_at, bookmarked)
                VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
            `, [title]);
            
            if (!result) {
                logger.error('No result returned from create conversation query');
                throw new Error('No result returned from database');
            }
            
            if (!result.lastInsertRowid) {
                logger.error('No lastInsertRowid in result', { result });
                throw new Error('No row ID returned for new conversation');
            }
            
            const newId = result.lastInsertRowid;
            logger.info('New conversation created successfully', { 
                id: newId, 
                title 
            });
            
            return newId;
        } catch (error) {
            logger.logError('Failed to create conversation', error, { title });
            throw new Error(`Failed to create conversation: ${error.message}`);
        }
    }
    
    /**
     * Get all conversations
     */
    async getAllConversations() {
        try {
            logger.info('Fetching all conversations');
            
            const result = await this.readQuery(`
                SELECT 
                    c.id, 
                    c.title, 
                    c.created_at, 
                    c.updated_at,
                    c.bookmarked,
                    (SELECT text FROM Messages 
                     WHERE conversation_id = c.id 
                     ORDER BY timestamp DESC LIMIT 1) as last_message
                FROM Conversations c
                ORDER BY c.updated_at DESC
            `);
            
            logger.info('Conversations retrieved successfully', { 
                count: result.length 
            });
            
            return result;
        } catch (error) {
            logger.logError('Failed to retrieve conversations', error);
            throw new Error(`Failed to retrieve conversations: ${error.message}`);
        }
    }
    
    /**
     * Add a message to a conversation
     * @param {number} conversationId - ID of the conversation
     * @param {string} sender - Message sender (user/ai)
     * @param {string} text - Message text
     */
    async addMessage(conversationId, sender, text) {
        try {
            logger.info('Adding new message', { 
                conversationId, 
                sender,
                textLength: text ? text.length : 0
            });
            
            const result = await this.writeQuery(`
                INSERT INTO Messages (conversation_id, sender, text, timestamp)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [conversationId, sender, text]);
            
            // Update conversation timestamp
            await this.writeQuery(`
                UPDATE Conversations
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [conversationId]);
            
            logger.info('Message added successfully', { 
                messageId: result.lastInsertRowid,
                conversationId
            });
            
            return result.lastInsertRowid;
        } catch (error) {
            logger.logError('Failed to add message', error, { 
                conversationId, 
                sender 
            });
            throw new Error(`Failed to add message: ${error.message}`);
        }
    }
    
    /**
     * Get messages for a conversation
     * @param {number} conversationId - ID of the conversation
     */
    async getMessages(conversationId) {
        try {
            logger.info('Fetching messages for conversation', { conversationId });
            
            const result = await this.readQuery(`
                SELECT id, conversation_id, sender, text, timestamp
                FROM Messages
                WHERE conversation_id = ?
                ORDER BY timestamp ASC
            `, [conversationId]);
            
            logger.info('Messages retrieved successfully', { 
                conversationId,
                count: result.length
            });
            
            return result;
        } catch (error) {
            logger.logError('Failed to retrieve messages', error, { conversationId });
            throw new Error(`Failed to retrieve messages: ${error.message}`);
        }
    }
}

// Create singleton instance
const db = new Database();

// Export the database instance
export default db;
