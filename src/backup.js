// Backup Module for Conversation Management 
const { invoke } = window.__TAURI__.core;

class BackupManager {
    constructor() {
        // Empty constructor
    }
    
    // Export all conversations to a JSON file
    async exportAllConversations() {
        try {
            // Get all conversations
            const conversations = await invoke('read_query', {
                query: `
                    SELECT id, title, created_at, updated_at, bookmarked
                    FROM Conversations
                    ORDER BY updated_at DESC
                `
            });
            
            // For each conversation, get messages and tags
            for (const conversation of conversations) {
                // Get messages
                conversation.messages = await invoke('read_query', {
                    query: `
                        SELECT id, sender, text, timestamp
                        FROM Messages
                        WHERE conversation_id = ?
                        ORDER BY timestamp ASC
                    `,
                    parameters: [conversation.id.toString()]
                });
                
                // Get tags
                conversation.tags = await invoke('read_query', {
                    query: `
                        SELECT id, name
                        FROM Tags
                        WHERE conversation_id = ?
                    `,
                    parameters: [conversation.id.toString()]
                });
            }
            
            // Get conversation links
            const links = await invoke('read_query', {
                query: `
                    SELECT source_conversation_id, target_conversation_id
                    FROM ConversationLinks
                `
            });
            
            // Create backup object
            const backup = {
                conversations,
                links,
                timestamp: new Date().toISOString(),
                appVersion: '1.0.0' // Replace with actual version when available
            };
            
            // Convert to JSON string
            return JSON.stringify(backup, null, 2);
        } catch (error) {
            console.error('Error exporting conversations:', error);
            throw error;
        }
    }
    
    // Import conversations from a JSON backup
    async importConversations(backupJson) {
        try {
            const backup = JSON.parse(backupJson);
            
            // Validate backup format
            if (!backup.conversations || !Array.isArray(backup.conversations)) {
                throw new Error('Invalid backup format: conversations not found');
            }
            
            // Begin transaction
            await invoke('write_query', {
                query: 'BEGIN TRANSACTION'
            });
            
            // Keep track of old IDs to new IDs mapping
            const idMapping = {};
            
            // Import conversations
            for (const conversation of backup.conversations) {
                // Insert conversation
                const result = await invoke('write_query', {
                    query: `
                        INSERT INTO Conversations (title, created_at, updated_at, bookmarked)
                        VALUES (?, ?, ?, ?)
                    `,
                    parameters: [
                        conversation.title,
                        conversation.created_at,
                        conversation.updated_at,
                        conversation.bookmarked.toString()
                    ]
                });
                
                const newId = result.lastInsertRowid;
                idMapping[conversation.id] = newId;
                
                // Insert messages
                if (conversation.messages && Array.isArray(conversation.messages)) {
                    for (const message of conversation.messages) {
                        await invoke('write_query', {
                            query: `
                                INSERT INTO Messages (conversation_id, sender, text, timestamp)
                                VALUES (?, ?, ?, ?)
                            `,
                            parameters: [
                                newId.toString(),
                                message.sender,
                                message.text,
                                message.timestamp
                            ]
                        });
                    }
                }
                
                // Insert tags
                if (conversation.tags && Array.isArray(conversation.tags)) {
                    for (const tag of conversation.tags) {
                        await invoke('write_query', {
                            query: `
                                INSERT OR IGNORE INTO Tags (name, conversation_id)
                                VALUES (?, ?)
                            `,
                            parameters: [
                                tag.name,
                                newId.toString()
                            ]
                        });
                    }
                }
            }
            
            // Import links
            if (backup.links && Array.isArray(backup.links)) {
                for (const link of backup.links) {
                    const sourceId = idMapping[link.source_conversation_id];
                    const targetId = idMapping[link.target_conversation_id];
                    
                    if (sourceId && targetId) {
                        await invoke('write_query', {
                            query: `
                                INSERT OR IGNORE INTO ConversationLinks (source_conversation_id, target_conversation_id)
                                VALUES (?, ?)
                            `,
                            parameters: [
                                sourceId.toString(),
                                targetId.toString()
                            ]
                        });
                    }
                }
            }
            
            // Commit transaction
            await invoke('write_query', {
                query: 'COMMIT'
            });
            
            return true;
        } catch (error) {
            // Rollback on error
            await invoke('write_query', {
                query: 'ROLLBACK'
            });
            
            console.error('Error importing conversations:', error);
            throw error;
        }
    }
}

// Create a singleton instance
const backupManager = new BackupManager();

// Export the backup manager instance
export default backupManager;
