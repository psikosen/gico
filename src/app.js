// Main Application Entry Point
import { invoke } from './tauri-bridge.js';
import * as MindMap from './mind-map.js';
import * as GeminiAPI from './gemini-api.js';
import * as Bookmarks from './bookmarks.js';
import { showNotification, showErrorNotification, showWarningNotification } from './notifications.js';
import logger from './logger.js';

// Application state
const state = {
    currentConversationId: null,
    conversations: [],
    conversationLinks: [],
    allTags: [],
    apiKey: null,
    isProcessingMessage: false
};

// DOM Elements
const elements = {
    // Will be populated in the initializeElements function
};

// Initialize application
export async function initializeApp() {
    try {
        console.log('Starting application initialization...');
        
        // Initialize elements
        console.log('Initializing UI elements...');
        initializeElements();
        
        // Check if critical elements exist
        const criticalElements = [
            { name: 'newConversationBtn', element: elements.newConversationBtn },
            { name: 'addConvoBtn', element: elements.addConvoBtn },
            { name: 'messageForm', element: elements.messageForm },
            { name: 'sendBtn', element: elements.sendBtn }
        ];
        
        for (const {name, element} of criticalElements) {
            if (!element) {
                console.error(`Critical element not found: ${name}`);
                throw new Error(`Critical UI element not found: ${name}`);
            }
        }
        
        // Initialize database tables
        console.log('Initializing database tables...');
        await initializeDatabase();
        
        // Load API key
        console.log('Loading API key...');
        state.apiKey = await GeminiAPI.getApiKey();
        
        // Initialize D3 mind map
        console.log('Initializing mind map...');
        MindMap.initializeD3('mind-map-svg', 'map-container');
        
        // Load conversations and links
        console.log('Loading conversations and metadata...');
        await loadConversations();
        await loadConversationLinks();
        await loadAllTags();
        
        // Create mind map visualization
        console.log('Creating mind map visualization...');
        MindMap.createMindMap(state.conversations, state.conversationLinks);
        
        // Set up event listeners
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        // Auto-resize message input
        if (elements.messageInput) {
            elements.messageInput.addEventListener('input', () => {
                elements.messageInput.style.height = 'auto';
                elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
            });
        }
        
        // Verify that buttons have proper event listeners
        verifyEventListeners();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showErrorNotification('Failed to initialize the application: ' + error.message);
    }
}

// Verify that critical event listeners are properly attached
function verifyEventListeners() {
    console.log('Verifying event listeners...');
    
    // Verify new conversation buttons
    if (elements.newConversationBtn) {
        console.log('Verifying newConversationBtn event listener...');
        const hasOldHandler = elements.newConversationBtn.onclick !== null;
        
        // Re-attach listener to be safe
        elements.newConversationBtn.removeEventListener('click', createNewConversation);
        elements.newConversationBtn.addEventListener('click', createNewConversation);
        
        console.log(`newConversationBtn listener ${hasOldHandler ? 'was already' : 'was not'} attached, now reattached`);
    }
    
    if (elements.addConvoBtn) {
        console.log('Verifying addConvoBtn event listener...');
        const hasOldHandler = elements.addConvoBtn.onclick !== null;
        
        // Re-attach listener to be safe
        elements.addConvoBtn.removeEventListener('click', createNewConversation);
        elements.addConvoBtn.addEventListener('click', createNewConversation);
        
        console.log(`addConvoBtn listener ${hasOldHandler ? 'was already' : 'was not'} attached, now reattached`);
    }
    
    // Verify message form submit
    if (elements.messageForm) {
        console.log('Verifying messageForm submit event listener...');
        
        // Re-attach listener to be safe
        elements.messageForm.removeEventListener('submit', sendMessage);
        elements.messageForm.addEventListener('submit', sendMessage);
        
        console.log('MessageForm submit listener reattached');
    }
}

// Initialize DOM elements
function initializeElements() {
    elements.searchInput = document.getElementById('search-input');
    elements.newConversationBtn = document.getElementById('new-conversation-btn');
    elements.addConvoBtn = document.getElementById('add-convo-btn');
    elements.conversationList = document.getElementById('conversation-list');
    elements.sidebarToggle = document.getElementById('sidebar-toggle');
    elements.sidebar = document.getElementById('sidebar');
    elements.conversationDialog = document.getElementById('conversation-dialog');
    elements.dialogTitle = document.getElementById('dialog-title');
    elements.closeDialogBtn = document.getElementById('close-dialog-btn');
    elements.messagesContainer = document.getElementById('messages-container');
    elements.messageForm = document.getElementById('message-form');
    elements.messageInput = document.getElementById('message-input');
    elements.sendBtn = document.getElementById('send-btn');
    elements.conversationTags = document.getElementById('conversation-tags');
    elements.linkConversationBtn = document.getElementById('link-conversation-btn');
    elements.addTagBtn = document.getElementById('add-tag-btn');
    elements.editTitleBtn = document.getElementById('edit-title-btn');
    elements.listViewBtn = document.getElementById('list-view-btn');
    elements.zoomInBtn = document.getElementById('zoom-in-btn');
    elements.zoomOutBtn = document.getElementById('zoom-out-btn');
    elements.resetViewBtn = document.getElementById('reset-view-btn');
    elements.tagsFilterSelect = document.getElementById('tags-filter-select');
    elements.settingsBtn = document.getElementById('settings-btn');
    elements.settingsDialog = document.getElementById('settings-dialog');
    elements.closeSettingsBtn = document.getElementById('close-settings-btn');
    elements.closeSettingsBtnAlt = document.getElementById('close-settings-btn-alt');
    elements.apiKeyInput = document.getElementById('api-key-input');
    elements.saveApiKeyBtn = document.getElementById('save-api-key-btn');
    elements.bookmarkBtn = document.getElementById('bookmark-btn');
    elements.bookmarksDialog = document.getElementById('bookmarks-dialog');
    elements.closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
    elements.bookmarksList = document.getElementById('bookmarks-list');
    
    // Templates
    elements.conversationItemTemplate = document.getElementById('conversation-item-template');
    elements.messageTemplate = document.getElementById('message-template');
    elements.tagTemplate = document.getElementById('tag-template');
}

// Set up event listeners
function setupEventListeners() {
    // Sidebar events
    elements.sidebarToggle.addEventListener('click', toggleSidebar);
    elements.listViewBtn.addEventListener('click', toggleSidebar);
    elements.searchInput.addEventListener('input', searchConversations);
    elements.tagsFilterSelect.addEventListener('change', filterConversationsByTag);
    
    // Conversation actions
    elements.newConversationBtn.addEventListener('click', createNewConversation);
    elements.addConvoBtn.addEventListener('click', createNewConversation);
    elements.closeDialogBtn.addEventListener('click', closeConversationDialog);
    elements.messageForm.addEventListener('submit', sendMessage);
    elements.linkConversationBtn.addEventListener('click', showLinkConversationDialog);
    elements.addTagBtn.addEventListener('click', showAddTagDialog);
    elements.editTitleBtn.addEventListener('click', showEditTitleDialog);
    
    // Mind map events
    elements.zoomInBtn.addEventListener('click', () => MindMap.zoomMap(1.2));
    elements.zoomOutBtn.addEventListener('click', () => MindMap.zoomMap(0.8));
    elements.resetViewBtn.addEventListener('click', MindMap.resetMapView);
    
    // Settings events
    if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', showSettingsDialog);
    if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', hideSettingsDialog);
    if (elements.closeSettingsBtnAlt) elements.closeSettingsBtnAlt.addEventListener('click', hideSettingsDialog);
    if (elements.saveApiKeyBtn) elements.saveApiKeyBtn.addEventListener('click', saveApiKey);
    
    // Bookmarks events
    if (elements.bookmarkBtn) elements.bookmarkBtn.addEventListener('click', toggleBookmarksDialog);
    if (elements.closeBookmarksBtn) elements.closeBookmarksBtn.addEventListener('click', hideBookmarksDialog);
    
    // Custom event listener for node clicks
    window.addEventListener('node-clicked', (event) => {
        const conversationId = event.detail.conversationId;
        openConversationDialog(conversationId);
    });
}

// Initialize database tables
async function initializeDatabase() {
    try {
        logger.info('Initializing database tables');
        
        // Create Conversations table
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS Conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    bookmarked INTEGER DEFAULT 0
                )
            `
        });
        
        // Create Messages table
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS Messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    sender TEXT NOT NULL,
                    text TEXT NOT NULL,
                    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE
                )
            `
        });
        
        // Create ConversationLinks table
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS ConversationLinks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_conversation_id INTEGER NOT NULL,
                    target_conversation_id INTEGER NOT NULL,
                    FOREIGN KEY (source_conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
                    UNIQUE(source_conversation_id, target_conversation_id)
                )
            `
        });
        
        // Create Tags table
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS Tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    conversation_id INTEGER NOT NULL,
                    FOREIGN KEY (conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
                    UNIQUE(name, conversation_id)
                )
            `
        });
        
        // Create TagLinks table for relationships between tags
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS TagLinks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_tag_id INTEGER NOT NULL,
                    target_tag_id INTEGER NOT NULL,
                    FOREIGN KEY (source_tag_id) REFERENCES Tags(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_tag_id) REFERENCES Tags(id) ON DELETE CASCADE,
                    UNIQUE(source_tag_id, target_tag_id)
                )
            `
        });
        
        // Create Settings table for API keys and preferences
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `
        });
        
        logger.info('Database initialized successfully');
        
        // Verify tables exist
        const tables = await invoke('list_tables');
        logger.info('Verified tables exist', { tables });
    } catch (error) {
        logger.error('Error initializing database:', error);
        throw new Error('Failed to initialize database: ' + error.message);
    }
}

// Load conversations
async function loadConversations() {
    try {
        logger.info('Loading conversations');
        
        const result = await invoke('read_query', {
            query: `
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
            `
        });
        
        logger.info(`Loaded ${result.length} conversations`);
        state.conversations = result;
        renderConversationList(state.conversations);
        return result;
    } catch (error) {
        logger.error('Error loading conversations:', error);
        showErrorNotification('Failed to load conversations');
        return [];
    }
}

// Load conversation links
async function loadConversationLinks() {
    try {
        logger.info('Loading conversation links');
        
        const result = await invoke('read_query', {
            query: `
                SELECT source_conversation_id, target_conversation_id
                FROM ConversationLinks
            `
        });
        
        logger.info(`Loaded ${result.length} conversation links`);
        state.conversationLinks = result;
        return result;
    } catch (error) {
        logger.error('Error loading conversation links:', error);
        showErrorNotification('Failed to load conversation links');
        return [];
    }
}

// Load all tags
async function loadAllTags() {
    try {
        logger.info('Loading all tags');
        
        const result = await invoke('read_query', {
            query: `
                SELECT DISTINCT name
                FROM Tags
                ORDER BY name
            `
        });
        
        state.allTags = result.map(tag => tag.name);
        logger.info(`Loaded ${state.allTags.length} unique tags`);
        populateTagsFilter(state.allTags);
        return state.allTags;
    } catch (error) {
        logger.error('Error loading all tags:', error);
        showErrorNotification('Failed to load tags for filter');
        return [];
    }
}

// Populate tags filter dropdown
function populateTagsFilter(tags) {
    // Clear current options except the first one
    while (elements.tagsFilterSelect.options.length > 1) {
        elements.tagsFilterSelect.remove(1);
    }
    
    // Add tag options
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        elements.tagsFilterSelect.appendChild(option);
    });
}

// Filter conversations by tag
async function filterConversationsByTag() {
    const selectedTag = elements.tagsFilterSelect.value;
    
    if (!selectedTag) {
        // If no tag selected, show all conversations
        renderConversationList(state.conversations);
        MindMap.createMindMap(state.conversations, state.conversationLinks);
        return;
    }
    
    try {
        const result = await invoke('read_query', {
            query: `
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
                JOIN Tags t ON c.id = t.conversation_id
                WHERE t.name = ?
                ORDER BY c.updated_at DESC
            `,
            parameters: [selectedTag]
        });
        
        // Update sidebar list
        renderConversationList(result);
        
        // Update mind map with tag filter
        MindMap.createMindMap(state.conversations, state.conversationLinks, selectedTag);
    } catch (error) {
        console.error('Error filtering conversations by tag:', error);
        showErrorNotification('Failed to filter conversations');
    }
}

// Toggle sidebar
function toggleSidebar() {
    elements.sidebar.classList.toggle('collapsed');
}

// Toggle bookmarks dialog
async function toggleBookmarksDialog() {
    if (elements.bookmarksDialog.classList.contains('active')) {
        hideBookmarksDialog();
    } else {
        await loadBookmarkedConversations();
        elements.bookmarksDialog.classList.add('active');
    }
}

// Hide bookmarks dialog
function hideBookmarksDialog() {
    elements.bookmarksDialog.classList.remove('active');
}

// Load bookmarked conversations
async function loadBookmarkedConversations() {
    const bookmarks = await Bookmarks.loadBookmarkedConversations();
    
    // Render bookmarks list
    elements.bookmarksList.innerHTML = '';
    
    if (bookmarks.length === 0) {
        elements.bookmarksList.innerHTML = '<div class="bookmark-empty-state">No bookmarked conversations yet</div>';
        return;
    }
    
    bookmarks.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.id = conv.id;
        
        const title = document.createElement('div');
        title.className = 'conversation-title';
        title.textContent = conv.title;
        
        const preview = document.createElement('div');
        preview.className = 'conversation-preview';
        preview.textContent = conv.last_message || 'No messages yet';
        
        const date = document.createElement('div');
        date.className = 'conversation-date';
        date.textContent = formatDate(new Date(conv.updated_at));
        
        item.appendChild(title);
        item.appendChild(preview);
        item.appendChild(date);
        
        item.addEventListener('click', () => {
            hideBookmarksDialog();
            openConversationDialog(conv.id);
        });
        
        elements.bookmarksList.appendChild(item);
    });
}

// Show settings dialog
function showSettingsDialog() {
    if (state.apiKey) {
        elements.apiKeyInput.value = state.apiKey;
    }
    
    elements.settingsDialog.classList.add('active');
}

// Hide settings dialog
function hideSettingsDialog() {
    elements.settingsDialog.classList.remove('active');
}

// Save API key
async function saveApiKey() {
    const newApiKey = elements.apiKeyInput.value.trim();
    
    if (!newApiKey) {
        showErrorNotification('API key cannot be empty');
        return;
    }
    
    const success = await GeminiAPI.saveApiKey(newApiKey);
    
    if (success) {
        state.apiKey = newApiKey;
        showNotification('API key saved successfully');
        hideSettingsDialog();
    } else {
        showErrorNotification('Failed to save API key');
    }
}

// Render conversation list
function renderConversationList(conversationsToRender) {
    // Clear current list
    elements.conversationList.innerHTML = '';
    
    if (conversationsToRender.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'conversation-empty-state';
        emptyState.textContent = 'No conversations found';
        elements.conversationList.appendChild(emptyState);
        return;
    }
    
    // Add conversation items
    conversationsToRender.forEach(conversation => {
        const template = elements.conversationItemTemplate.content.cloneNode(true);
        const conversationItem = template.querySelector('.conversation-item');
        
        conversationItem.dataset.id = conversation.id;
        conversationItem.querySelector('.conversation-title').textContent = conversation.title;
        conversationItem.querySelector('.conversation-preview').textContent = conversation.last_message || 'No messages yet';
        
        // Format date
        const date = new Date(conversation.updated_at);
        conversationItem.querySelector('.conversation-date').textContent = formatDate(date);
        
        // Add active class if this is the current conversation
        if (conversation.id === state.currentConversationId) {
            conversationItem.classList.add('active');
        }
        
        // Add bookmark indicator if bookmarked
        if (conversation.bookmarked) {
            const bookmarkIndicator = document.createElement('span');
            bookmarkIndicator.className = 'bookmark-indicator';
            bookmarkIndicator.innerHTML = '★';
            bookmarkIndicator.style.color = '#FFD700';
            bookmarkIndicator.style.marginLeft = '5px';
            conversationItem.querySelector('.conversation-title').appendChild(bookmarkIndicator);
        }
        
        // Add tag indicators to the conversation item
        addTagIndicatorsToListItem(conversationItem, conversation.id);
        
        // Add click event listener
        conversationItem.addEventListener('click', () => {
            // First update sidebar selection
            const currentActive = elements.conversationList.querySelector('.conversation-item.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            conversationItem.classList.add('active');
            
            // Then open the dialog and zoom to node
            openConversationDialog(conversation.id);
        });
        
        elements.conversationList.appendChild(conversationItem);
    });
}

// Add tag indicators to list item
async function addTagIndicatorsToListItem(item, conversationId) {
    try {
        const tagsResult = await invoke('read_query', {
            query: `
                SELECT name
                FROM Tags
                WHERE conversation_id = ?
            `,
            parameters: [conversationId.toString()]
        });
        
        if (tagsResult.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'item-tags-container';
            
            tagsResult.forEach(tag => {
                const tagBadge = document.createElement('span');
                tagBadge.className = 'item-tag';
                tagBadge.textContent = tag.name;
                tagsContainer.appendChild(tagBadge);
            });
            
            // Insert the tags container after the title
            const title = item.querySelector('.conversation-title');
            title.insertAdjacentElement('afterend', tagsContainer);
        }
    } catch (error) {
        console.error('Error loading tags for list item:', error);
    }
}

// Format date
function formatDate(date) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
        return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString() + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Create new conversation with enhanced error handling and logging
async function createNewConversation() {
    console.log('createNewConversation function called');
    
    try {
        // Generate a title with timestamp
        const title = `New Conversation ${new Date().toLocaleString()}`;
        console.log(`Creating new conversation with title: "${title}"`);
        
        // Verify database connection before proceeding
        try {
            await invoke('list_tables');
            console.log('Database connection verified');
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            showErrorNotification('Database connection error. Please restart the application.');
            return;
        }
        
        // Create the conversation with detailed logging
        console.log('Sending query to create new conversation...');
        const result = await invoke('write_query', {
            query: `
                INSERT INTO Conversations (title, created_at, updated_at, bookmarked)
                VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
            `,
            parameters: [title]
        });
        
        console.log('Query result:', result);
        
        // Validate the result
        if (!result || typeof result.lastInsertRowid === 'undefined') {
            console.error('No valid result returned from query:', result);
            throw new Error('Database did not return a valid result');
        }
        
        // Get the ID of the new conversation
        const newConversationId = result.lastInsertRowid;
        console.log(`New conversation created with ID: ${newConversationId}`);
        
        // Verify the conversation was created
        const verifyResult = await invoke('read_query', {
            query: `SELECT id, title FROM Conversations WHERE id = ?`,
            parameters: [newConversationId.toString()]
        });
        
        if (!verifyResult || verifyResult.length === 0) {
            console.error('Verification failed - conversation not found after creation');
            throw new Error('Failed to verify new conversation');
        }
        
        console.log('Conversation verified in database:', verifyResult[0]);
        
        // Refresh the conversation list
        console.log('Refreshing conversation list...');
        await loadConversations();
        
        // Refresh the mind map
        console.log('Refreshing mind map...');
        await loadConversationLinks();
        MindMap.createMindMap(state.conversations, state.conversationLinks);
        
        // Open the new conversation
        console.log('Opening new conversation dialog...');
        openConversationDialog(newConversationId);
        
        showNotification('New conversation created');
    } catch (error) {
        console.error('Error creating new conversation:', error);
        showErrorNotification(`Failed to create a new conversation: ${error.message}`);
        
        // Attempt recovery by refreshing the conversation list
        try {
            await loadConversations();
        } catch (refreshError) {
            console.error('Failed to refresh conversations after error:', refreshError);
        }
    }
}

// Open conversation dialog
async function openConversationDialog(conversationId) {
    try {
        // Update current conversation ID
        state.currentConversationId = conversationId;
        
        // Get conversation details
        const result = await invoke('read_query', {
            query: `
                SELECT id, title, created_at, updated_at, bookmarked
                FROM Conversations
                WHERE id = ?
            `,
            parameters: [conversationId.toString()]
        });
        
        if (result.length > 0) {
            const conversation = result[0];
            
            // Update dialog title
            elements.dialogTitle.textContent = conversation.title;
            
            // Add bookmark button if not present
            if (!document.querySelector('.bookmark-status-btn')) {
                const bookmarkStatusBtn = document.createElement('button');
                bookmarkStatusBtn.className = 'dialog-action-btn bookmark-status-btn';
                bookmarkStatusBtn.title = conversation.bookmarked ? 'Remove Bookmark' : 'Bookmark';
                
                const bookmarkIcon = document.createElement('i');
                bookmarkIcon.className = conversation.bookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
                
                bookmarkStatusBtn.appendChild(bookmarkIcon);
                bookmarkStatusBtn.addEventListener('click', () => Bookmarks.toggleBookmark(conversationId));
                
                // Insert before the close button
                const actions = document.querySelector('.dialog-actions');
                actions.insertBefore(bookmarkStatusBtn, elements.closeDialogBtn);
            } else {
                // Update existing bookmark button
                const btn = document.querySelector('.bookmark-status-btn i');
                if (conversation.bookmarked) {
                    btn.className = 'fas fa-bookmark';
                    document.querySelector('.bookmark-status-btn').title = 'Remove Bookmark';
                } else {
                    btn.className = 'far fa-bookmark';
                    document.querySelector('.bookmark-status-btn').title = 'Bookmark';
                }
            }
            
            // Load messages for this conversation
            await loadMessages(conversationId);
            
            // Load tags for this conversation
            await loadTags(conversationId);
            
            // Highlight selected node in the map
            const nodeData = MindMap.highlightNode(conversationId);
            MindMap.highlightConnectedLinks(conversationId, state.conversationLinks);
            
            // Zoom to the selected node
            MindMap.zoomToNode(conversationId);
            
            // Show dialog
            elements.conversationDialog.classList.add('active');
        }
    } catch (error) {
        console.error('Error opening conversation dialog:', error);
        showErrorNotification('Failed to open conversation');
    }
}

// Close conversation dialog
function closeConversationDialog() {
    elements.conversationDialog.classList.remove('active');
    state.currentConversationId = null;
    
    // Remove highlight from nodes
    MindMap.highlightNode(null);
}

// Load messages for a conversation
async function loadMessages(conversationId) {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT id, conversation_id, sender, text, timestamp
                FROM Messages
                WHERE conversation_id = ?
                ORDER BY timestamp ASC
            `,
            parameters: [conversationId.toString()]
        });
        
        renderMessages(result);
        return result;
    } catch (error) {
        console.error('Error loading messages:', error);
        showErrorNotification('Failed to load messages');
        return [];
    }
}

// Render messages
function renderMessages(messagesToRender) {
    // Clear current messages
    elements.messagesContainer.innerHTML = '';
    
    if (messagesToRender.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'messages-empty-state';
        emptyState.textContent = 'No messages yet. Start a conversation!';
        elements.messagesContainer.appendChild(emptyState);
        return;
    }
    
    // Add message items
    messagesToRender.forEach(message => {
        const template = elements.messageTemplate.content.cloneNode(true);
        const messageElement = template.querySelector('.message');
        
        messageElement.dataset.id = message.id;
        messageElement.classList.add(message.sender.toLowerCase());
        messageElement.querySelector('.message-content').textContent = message.text;
        
        // Format date
        const date = new Date(message.timestamp);
        messageElement.querySelector('.message-timestamp').textContent = formatDate(date);
        
        // Add edit event listener
        const editBtn = messageElement.querySelector('.edit-message-btn');
        editBtn.addEventListener('click', () => {
            editMessage(message.id);
        });
        
        // Add delete event listener
        const deleteBtn = messageElement.querySelector('.delete-message-btn');
        deleteBtn.addEventListener('click', () => {
            deleteMessage(message.id);
        });
        
        elements.messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Load tags for a conversation
async function loadTags(conversationId) {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT id, name, conversation_id
                FROM Tags
                WHERE conversation_id = ?
            `,
            parameters: [conversationId.toString()]
        });
        
        renderTags(result);
        return result;
    } catch (error) {
        console.error('Error loading tags:', error);
        showErrorNotification('Failed to load tags');
        return [];
    }
}

// Render tags
function renderTags(tagsToRender) {
    // Clear current tags
    elements.conversationTags.innerHTML = '';
    
    if (tagsToRender.length === 0) {
        return;
    }
    
    // Add tag items
    tagsToRender.forEach(tag => {
        const template = elements.tagTemplate.content.cloneNode(true);
        const tagElement = template.querySelector('.tag');
        
        tagElement.dataset.id = tag.id;
        tagElement.querySelector('.tag-text').textContent = tag.name;
        
        // Add remove event listener
        const removeBtn = tagElement.querySelector('.tag-remove');
        removeBtn.addEventListener('click', () => {
            removeTag(tag.id);
        });
        
        // Add tag element
        elements.conversationTags.appendChild(tagElement);
    });
}

// Send message
async function sendMessage(event) {
    event.preventDefault();
    
    if (state.isProcessingMessage) {
        return; // Prevent multiple submissions
    }
    
    if (!state.currentConversationId) {
        showErrorNotification('Please select a conversation first');
        return;
    }
    
    const messageText = elements.messageInput.value.trim();
    if (!messageText) {
        // Show warning for empty message
        showWarningNotification('Please enter a message before sending');
        return;
    }
    
    try {
        // Set processing flag
        state.isProcessingMessage = true;
        
        // Change button state to waiting
        elements.sendBtn.classList.replace('activate', 'waiting');
        elements.sendBtn.disabled = true;
        
        // Save user message to database
        await invoke('write_query', {
            query: `
                INSERT INTO Messages (conversation_id, sender, text, timestamp)
                VALUES (?, 'user', ?, CURRENT_TIMESTAMP)
            `,
            parameters: [state.currentConversationId.toString(), messageText]
        });
        
        // Update conversation's updated_at timestamp
        await invoke('write_query', {
            query: `
                UPDATE Conversations
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            parameters: [state.currentConversationId.toString()]
        });
        
        // Clear input
        elements.messageInput.value = '';
        elements.messageInput.style.height = 'auto';
        
        // Reload messages
        await loadMessages(state.currentConversationId);
        
        // Get AI response using Gemini API
        await handleGeminiResponse(messageText);
        
        // Refresh conversation list and mind map
        await loadConversations();
        
        // Change button state to activated
        elements.sendBtn.classList.replace('waiting', 'activated');
        
        // After a delay, reset button state
        setTimeout(() => {
            elements.sendBtn.classList.replace('activated', 'activate');
            elements.sendBtn.disabled = false;
            state.isProcessingMessage = false;
        }, 1500);
        
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorNotification('Failed to send message');
        
        // Reset button state
        elements.sendBtn.classList.replace('waiting', 'activate');
        elements.sendBtn.disabled = false;
        state.isProcessingMessage = false;
    }
}

// Handle Gemini API response
async function handleGeminiResponse(userMessage) {
    try {
        // Check if API key is available
        if (!state.apiKey) {
            showErrorNotification('Gemini API key is missing. Please set it in Settings.');
            await invoke('write_query', {
                query: `
                    INSERT INTO Messages (conversation_id, sender, text, timestamp)
                    VALUES (?, 'ai', ?, CURRENT_TIMESTAMP)
                `,
                parameters: [state.currentConversationId.toString(), "ERROR: Gemini API key is not set. Please configure it in the settings."]
            });
            
            await loadMessages(state.currentConversationId);
            return;
        }
        
        // Show loading state in UI
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'message ai loading';
        loadingMessage.innerHTML = `
            <div class="message-content">
                <div class="typing-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;
        elements.messagesContainer.appendChild(loadingMessage);
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
        
        // Get conversation context
        const context = await GeminiAPI.getConversationContext(state.currentConversationId);
        
        // Create a new message in the database to store the AI response
        const messageResult = await invoke('write_query', {
            query: `
                INSERT INTO Messages (conversation_id, sender, text, timestamp)
                VALUES (?, 'ai', '', CURRENT_TIMESTAMP)
            `,
            parameters: [state.currentConversationId.toString()]
        });
        
        const aiMessageId = messageResult.lastInsertRowid;
        
        try {
            // Remove loading message
            elements.messagesContainer.removeChild(loadingMessage);
            
            // Create actual message for streaming content
            const messageElement = document.createElement('div');
            messageElement.className = 'message ai';
            messageElement.dataset.id = aiMessageId;
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn edit-message-btn';
            editBtn.title = 'Edit';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-message-btn';
            deleteBtn.title = 'Delete';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            
            const messageTimestamp = document.createElement('div');
            messageTimestamp.className = 'message-timestamp';
            messageTimestamp.textContent = formatDate(new Date());
            
            messageElement.appendChild(messageContent);
            messageElement.appendChild(actionsDiv);
            messageElement.appendChild(messageTimestamp);
            elements.messagesContainer.appendChild(messageElement);
            
            // Add event listeners for edit and delete
            editBtn.addEventListener('click', () => {
                editMessage(aiMessageId);
            });
            
            deleteBtn.addEventListener('click', () => {
                deleteMessage(aiMessageId);
            });
            
            // Stream response from Gemini API
            await GeminiAPI.streamGenerateContent(
                state.apiKey,
                context,
                // Handle chunk callback
                (textChunk, fullResponse) => {
                    // Update the message content
                    messageContent.textContent = fullResponse;
                    
                    // Scroll to the bottom
                    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
                },
                // Handle done callback
                async (fullResponse) => {
                    // Update the message in the database with the full response
                    await invoke('write_query', {
                        query: `
                            UPDATE Messages
                            SET text = ?
                            WHERE id = ?
                        `,
                        parameters: [fullResponse, aiMessageId.toString()]
                    });
                    
                    // Update conversation's updated_at timestamp
                    await invoke('write_query', {
                        query: `
                            UPDATE Conversations
                            SET updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `,
                        parameters: [state.currentConversationId.toString()]
                    });
                    
                    // Refresh conversation list
                    await loadConversations();
                },
                // Handle error callback
                async (error) => {
                    console.error('Error calling Gemini API:', error);
                    
                    // Create error message
                    await invoke('write_query', {
                        query: `
                            UPDATE Messages
                            SET text = ?
                            WHERE id = ?
                        `,
                        parameters: [`Error calling Gemini API: ${error.message}`, aiMessageId.toString()]
                    });
                    
                    messageContent.textContent = `Error calling Gemini API: ${error.message}`;
                    showErrorNotification(`API Error: ${error.message}`);
                }
            );
        } catch (apiError) {
            console.error('Error in API call handling:', apiError);
            showErrorNotification(`API Error: ${apiError.message}`);
        }
    } catch (error) {
        console.error('Error getting AI response:', error);
        showErrorNotification('Failed to get AI response');
    }
}

// Edit message
async function editMessage(messageId) {
    try {
        // Find the message element
        const messageElement = document.querySelector(`.message[data-id="${messageId}"]`);
        const messageContent = messageElement.querySelector('.message-content');
        const currentText = messageContent.textContent;
        
        // Create input field for editing
        const inputField = document.createElement('textarea');
        inputField.className = 'edit-message-input';
        inputField.value = currentText;
        
        // Replace the message content with the input field
        messageContent.innerHTML = '';
        messageContent.appendChild(inputField);
        
        // Focus the input field
        inputField.focus();
        
        // Create save and cancel buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'edit-buttons';
        
        const saveButton = document.createElement('button');
        saveButton.className = 'edit-save-btn';
        saveButton.innerHTML = '<i class="fas fa-check"></i>';
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'edit-cancel-btn';
        cancelButton.innerHTML = '<i class="fas fa-times"></i>';
        
        buttonsContainer.appendChild(saveButton);
        buttonsContainer.appendChild(cancelButton);
        messageContent.appendChild(buttonsContainer);
        
        // Save button event listener
        saveButton.addEventListener('click', async () => {
            const newText = inputField.value.trim();
            if (!newText) {
                showWarningNotification('Message cannot be empty');
                return;
            }
            
            try {
                // Update message in database
                await invoke('write_query', {
                    query: `
                        UPDATE Messages
                        SET text = ?
                        WHERE id = ?
                    `,
                    parameters: [newText, messageId.toString()]
                });
                
                // Reload messages
                await loadMessages(state.currentConversationId);
                
                // Refresh conversation list if it's the last message
                await loadConversations();
            } catch (error) {
                console.error('Error updating message:', error);
                showErrorNotification('Failed to update message');
            }
        });
        
        // Cancel button event listener
        cancelButton.addEventListener('click', () => {
            messageContent.textContent = currentText;
        });
    } catch (error) {
        console.error('Error editing message:', error);
        showErrorNotification('Failed to edit message');
    }
}

// Delete message
async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }
    
    try {
        // Delete message from database
        await invoke('write_query', {
            query: `
                DELETE FROM Messages
                WHERE id = ?
            `,
            parameters: [messageId.toString()]
        });
        
        // Reload messages
        await loadMessages(state.currentConversationId);
        
        // Refresh conversation list to update preview
        await loadConversations();
    } catch (error) {
        console.error('Error deleting message:', error);
        showErrorNotification('Failed to delete message');
    }
}

// Search conversations
async function searchConversations() {
    const searchTerm = elements.searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        // If search is empty, show all conversations
        renderConversationList(state.conversations);
        return;
    }
    
    try {
        // Search in database
        const result = await invoke('read_query', {
            query: `
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
                WHERE c.title LIKE ? 
                OR c.id IN (
                    SELECT conversation_id 
                    FROM Messages 
                    WHERE text LIKE ?
                )
                OR c.id IN (
                    SELECT conversation_id
                    FROM Tags
                    WHERE name LIKE ?
                )
                ORDER BY c.updated_at DESC
            `,
            parameters: [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
        });
        
        renderConversationList(result);
    } catch (error) {
        console.error('Error searching conversations:', error);
        showErrorNotification('Failed to search conversations');
    }
}

// Show add tag dialog
function showAddTagDialog() {
    if (!state.currentConversationId) {
        showErrorNotification('Please select a conversation first');
        return;
    }
    
    // Create a custom dialog for adding tags
    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'custom-dialog';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'custom-dialog-content';
    
    const header = document.createElement('h3');
    header.textContent = 'Add Tag';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter tag name...';
    
    // Create options for existing tags to allow reuse
    const existingTagsContainer = document.createElement('div');
    existingTagsContainer.className = 'existing-tags';
    
    if (state.allTags.length > 0) {
        const existingTagsLabel = document.createElement('p');
        existingTagsLabel.textContent = 'Or select from existing tags:';
        existingTagsContainer.appendChild(existingTagsLabel);
        
        const tagsList = document.createElement('div');
        tagsList.className = 'tags-list';
        
        state.allTags.forEach(tagName => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';
            tagItem.textContent = tagName;
            tagItem.addEventListener('click', () => {
                input.value = tagName;
            });
            tagsList.appendChild(tagItem);
        });
        
        existingTagsContainer.appendChild(tagsList);
    }
    
    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';
    
    const addButton = document.createElement('button');
    addButton.textContent = 'Add';
    addButton.addEventListener('click', () => {
        const tagName = input.value.trim();
        if (tagName) {
            addTag(tagName);
            document.body.removeChild(dialogContainer);
        } else {
            showWarningNotification('Tag name cannot be empty');
        }
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);
    });
    
    buttons.appendChild(addButton);
    buttons.appendChild(cancelButton);
    
    dialogContent.appendChild(header);
    dialogContent.appendChild(input);
    dialogContent.appendChild(existingTagsContainer);
    dialogContent.appendChild(buttons);
    
    dialogContainer.appendChild(dialogContent);
    document.body.appendChild(dialogContainer);
    
    // Focus the input field
    input.focus();
}

// Add tag
async function addTag(tagName) {
    try {
        const result = await invoke('write_query', {
            query: `
                INSERT OR IGNORE INTO Tags (name, conversation_id)
                VALUES (?, ?)
            `,
            parameters: [tagName, state.currentConversationId.toString()]
        });
        
        // Reload tags for current conversation
        await loadTags(state.currentConversationId);
        
        // Reload all tags for filter
        await loadAllTags();
        
        // Refresh mind map to reflect updated tags
        await loadConversationLinks();
        MindMap.createMindMap(state.conversations, state.conversationLinks);
        
        // Update the sidebar list to show tag indicators
        await loadConversations();
    } catch (error) {
        console.error('Error adding tag:', error);
        showErrorNotification('Failed to add tag');
    }
}

// Remove tag
async function removeTag(tagId) {
    try {
        await invoke('write_query', {
            query: `
                DELETE FROM Tags
                WHERE id = ?
            `,
            parameters: [tagId.toString()]
        });
        
        // Reload tags
        await loadTags(state.currentConversationId);
        
        // Reload all tags for filter
        await loadAllTags();
        
        // Refresh mind map
        await loadConversationLinks();
        MindMap.createMindMap(state.conversations, state.conversationLinks);
        
        // Update the sidebar list to show tag indicators
        await loadConversations();
    } catch (error) {
        console.error('Error removing tag:', error);
        showErrorNotification('Failed to remove tag');
    }
}

// Show edit title dialog
function showEditTitleDialog() {
    if (!state.currentConversationId) {
        showErrorNotification('Please select a conversation first');
        return;
    }
    
    // Create a custom dialog for editing title
    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'custom-dialog';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'custom-dialog-content';
    
    const header = document.createElement('h3');
    header.textContent = 'Edit Conversation Title';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = elements.dialogTitle.textContent;
    input.placeholder = 'Enter new title...';
    
    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', () => {
        const newTitle = input.value.trim();
        if (newTitle) {
            updateConversationTitle(newTitle);
            document.body.removeChild(dialogContainer);
        } else {
            showWarningNotification('Title cannot be empty');
        }
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);
    });
    
    buttons.appendChild(saveButton);
    buttons.appendChild(cancelButton);
    
    dialogContent.appendChild(header);
    dialogContent.appendChild(input);
    dialogContent.appendChild(buttons);
    
    dialogContainer.appendChild(dialogContent);
    document.body.appendChild(dialogContainer);
    
    // Focus and select the input field
    input.focus();
    input.select();
}

// Update conversation title
async function updateConversationTitle(newTitle) {
    try {
        await invoke('write_query', {
            query: `
                UPDATE Conversations
                SET title = ?
                WHERE id = ?
            `,
            parameters: [newTitle, state.currentConversationId.toString()]
        });
        
        // Update dialog title
        elements.dialogTitle.textContent = newTitle;
        
        // Refresh conversation list
        await loadConversations();
        
        // Refresh mind map
        await loadConversationLinks();
        MindMap.createMindMap(state.conversations, state.conversationLinks);
    } catch (error) {
        console.error('Error updating conversation title:', error);
        showErrorNotification('Failed to update title');
    }
}

// Show link conversation dialog
async function showLinkConversationDialog() {
    if (!state.currentConversationId) {
        showErrorNotification('Please select a conversation first');
        return;
    }
    
    try {
        // Get all conversations except the current one
        const result = await invoke('read_query', {
            query: `
                SELECT id, title, bookmarked
                FROM Conversations
                WHERE id != ?
                ORDER BY updated_at DESC
            `,
            parameters: [state.currentConversationId.toString()]
        });
        
        if (result.length === 0) {
            showNotification('No other conversations available to link');
            return;
        }
        
        // Create a custom dialog for linking conversations
        const dialogContainer = document.createElement('div');
        dialogContainer.className = 'custom-dialog';
        
        const dialogContent = document.createElement('div');
        dialogContent.className = 'custom-dialog-content';
        
        const header = document.createElement('h3');
        header.textContent = 'Link to Conversation';
        
        const conversationsList = document.createElement('div');
        conversationsList.className = 'conversations-list';
        
        // Add each conversation as a selectable item
        result.forEach(conv => {
            const convItem = document.createElement('div');
            convItem.className = 'conversation-link-item';
            convItem.dataset.id = conv.id;
            
            // Add bookmark indicator if bookmarked
            let titleText = conv.title;
            if (conv.bookmarked) {
                titleText = `★ ${titleText}`;
            }
            
            convItem.textContent = titleText;
            
            // Check if already linked
            const isLinked = state.conversationLinks.some(
                link => (link.source_conversation_id == state.currentConversationId && 
                         link.target_conversation_id == conv.id) ||
                        (link.source_conversation_id == conv.id && 
                         link.target_conversation_id == state.currentConversationId)
            );
            
            if (isLinked) {
                convItem.classList.add('selected');
                convItem.innerHTML += ' <span class="already-linked">(Already Linked)</span>';
            }
            
            convItem.addEventListener('click', () => {
                // Select/deselect conversation
                convItem.classList.toggle('selected');
            });
            
            conversationsList.appendChild(convItem);
        });
        
        const buttons = document.createElement('div');
        buttons.className = 'dialog-buttons';
        
        const linkButton = document.createElement('button');
        linkButton.textContent = 'Link Selected';
        linkButton.addEventListener('click', async () => {
            const selectedIds = Array.from(
                conversationsList.querySelectorAll('.conversation-link-item.selected:not(.already-linked)')
            ).map(item => parseInt(item.dataset.id));
            
            if (selectedIds.length === 0) {
                showWarningNotification('Please select at least one new conversation to link');
                return;
            }
            
            // Create links for each selected conversation
            for (const targetId of selectedIds) {
                await linkConversations(state.currentConversationId, targetId);
            }
            
            document.body.removeChild(dialogContainer);
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(dialogContainer);
        });
        
        buttons.appendChild(linkButton);
        buttons.appendChild(cancelButton);
        
        dialogContent.appendChild(header);
        dialogContent.appendChild(conversationsList);
        dialogContent.appendChild(buttons);
        
        dialogContainer.appendChild(dialogContent);
        document.body.appendChild(dialogContainer);
    } catch (error) {
        console.error('Error showing link dialog:', error);
        showErrorNotification('Failed to show link dialog');
    }
}

// Link conversations
async function linkConversations(sourceId, targetId) {
    try {
        await invoke('write_query', {
            query: `
                INSERT OR IGNORE INTO ConversationLinks (source_conversation_id, target_conversation_id)
                VALUES (?, ?)
            `,
            parameters: [sourceId.toString(), targetId.toString()]
        });
        
        // Refresh conversation links
        await loadConversationLinks();
        
        // Refresh mind map
        MindMap.createMindMap(state.conversations, state.conversationLinks);
        
        // If dialog is open, refresh the highlighted node
        if (state.currentConversationId) {
            MindMap.highlightNode(state.currentConversationId);
            MindMap.highlightConnectedLinks(state.currentConversationId, state.conversationLinks);
        }
        
        showNotification('Conversations linked successfully');
    } catch (error) {
        console.error('Error linking conversations:', error);
        showErrorNotification('Failed to link conversations');
    }
}

// Initialize the app when the module is imported
document.addEventListener('DOMContentLoaded', initializeApp);

// Export functions that may need to be called from other modules
export {
    state,
    elements,
    openConversationDialog,
    closeConversationDialog,
    loadConversations,
    loadConversationLinks,
    loadAllTags,
    sendMessage,
    createNewConversation
};