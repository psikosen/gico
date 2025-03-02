// Bookmarks Management
const { invoke } = window.__TAURI__.core;
import { showNotification, showErrorNotification } from './notifications.js';

// Load bookmarked conversations
export async function loadBookmarkedConversations() {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT 
                    id, title, created_at, updated_at,
                    (SELECT text FROM Messages 
                     WHERE conversation_id = Conversations.id 
                     ORDER BY timestamp DESC LIMIT 1) as last_message
                FROM Conversations
                WHERE bookmarked = 1
                ORDER BY updated_at DESC
            `
        });
        
        return result;
    } catch (error) {
        console.error('Error loading bookmarked conversations:', error);
        showErrorNotification('Failed to load bookmarks');
        return [];
    }
}

// Toggle bookmark status
export async function toggleBookmark(conversationId) {
    try {
        // Get current bookmark status
        const result = await invoke('read_query', {
            query: `
                SELECT bookmarked FROM Conversations
                WHERE id = ?
            `,
            parameters: [conversationId.toString()]
        });
        
        if (result.length > 0) {
            const currentStatus = result[0].bookmarked;
            const newStatus = currentStatus ? 0 : 1;
            
            // Update bookmark status
            await invoke('write_query', {
                query: `
                    UPDATE Conversations
                    SET bookmarked = ?
                    WHERE id = ?
                `,
                parameters: [newStatus.toString(), conversationId.toString()]
            });
            
            // Return the new status
            return newStatus === 1;
        }
        return false;
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        showErrorNotification('Failed to update bookmark');
        return false;
    }
}

// Get bookmark status
export async function getBookmarkStatus(conversationId) {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT bookmarked FROM Conversations
                WHERE id = ?
            `,
            parameters: [conversationId.toString()]
        });
        
        if (result.length > 0) {
            return result[0].bookmarked === 1;
        }
        return false;
    } catch (error) {
        console.error('Error getting bookmark status:', error);
        return false;
    }
}
