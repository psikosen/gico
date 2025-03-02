// Import Tauri API
const { invoke } = window.__TAURI__.core;

// DOM Elements
const searchInput = document.getElementById('search-input');
const newConversationBtn = document.getElementById('new-conversation-btn');
const addConvoBtn = document.getElementById('add-convo-btn');
const conversationList = document.getElementById('conversation-list');
const mindMapSvg = document.getElementById('mind-map-svg');
const mapContainer = document.getElementById('map-container');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const conversationDialog = document.getElementById('conversation-dialog');
const dialogTitle = document.getElementById('dialog-title');
const closeDialogBtn = document.getElementById('close-dialog-btn');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const conversationTags = document.getElementById('conversation-tags');
const linkConversationBtn = document.getElementById('link-conversation-btn');
const addTagBtn = document.getElementById('add-tag-btn');
const editTitleBtn = document.getElementById('edit-title-btn');
const listViewBtn = document.getElementById('list-view-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const resetViewBtn = document.getElementById('reset-view-btn');
const tagsFilterSelect = document.getElementById('tags-filter-select');
const settingsBtn = document.getElementById('settings-btn');
const settingsDialog = document.getElementById('settings-dialog');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');

// Templates
const conversationItemTemplate = document.getElementById('conversation-item-template');
const messageTemplate = document.getElementById('message-template');
const tagTemplate = document.getElementById('tag-template');

// State
let currentConversationId = null;
let conversations = [];
let messages = [];
let tags = [];
let allTags = []; // Array to store all unique tags across conversations
let conversationLinks = [];
let simulation = null;
let transform = { x: 0, y: 0, k: 1 }; // For zoom and pan
let apiKey = ''; // Store the Gemini API key

// D3 Selections
let svg = d3.select('#mind-map-svg');
let g = d3.select('#map-container');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
sidebarToggle.addEventListener('click', toggleSidebar);
newConversationBtn.addEventListener('click', createNewConversation);
addConvoBtn.addEventListener('click', createNewConversation);
searchInput.addEventListener('input', searchConversations);
linkConversationBtn.addEventListener('click', showLinkConversationDialog);
addTagBtn.addEventListener('click', showAddTagDialog);
editTitleBtn.addEventListener('click', showEditTitleDialog);
closeDialogBtn.addEventListener('click', closeConversationDialog);
messageForm.addEventListener('submit', sendMessage);
listViewBtn.addEventListener('click', toggleSidebar);
zoomInBtn.addEventListener('click', () => zoomMap(1.2));
zoomOutBtn.addEventListener('click', () => zoomMap(0.8));
resetViewBtn.addEventListener('click', resetMapView);
tagsFilterSelect.addEventListener('change', filterConversationsByTag);
if (settingsBtn) settingsBtn.addEventListener('click', showSettingsDialog);
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', hideSettingsDialog);
if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);

// Zoom behavior
const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
        transform = event.transform;
        g.attr('transform', event.transform);
    });

svg.call(zoom);

// Initialize Application
async function initializeApp() {
    try {
        // Initialize database tables if they don't exist
        await initializeDatabase();
        
        // Load API key from local storage if available
        loadApiKey();
        
        // Load conversations
        await loadConversations();
        
        // Load conversation links
        await loadConversationLinks();
        
        // Load all tags for filter
        await loadAllTags();
        
        // Initialize mind map
        initializeMindMap();
        
        // Auto-resize message input
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
        });
    } catch (error) {
        console.error('Error initializing app:', error);
        showErrorNotification('Failed to initialize the application');
    }
}

// Initialize Database
async function initializeDatabase() {
    try {
        // Create Conversations table
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS Conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        
        // Create Settings table for API keys and preferences
        await invoke('create_table', {
            query: `
                CREATE TABLE IF NOT EXISTS Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `
        });
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw new Error('Failed to initialize database');
    }
}

// Load API Key
async function loadApiKey() {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT value FROM Settings WHERE key = 'gemini_api_key'
            `
        });
        
        if (result.length > 0) {
            apiKey = result[0].value;
            console.log('API key loaded successfully');
        } else {
            console.log('No API key found in settings');
        }
    } catch (error) {
        console.error('Error loading API key:', error);
    }
}

// Save API Key
async function saveApiKey() {
    const newApiKey = apiKeyInput.value.trim();
    
    if (!newApiKey) {
        showErrorNotification('API key cannot be empty');
        return;
    }
    
    try {
        await invoke('write_query', {
            query: `
                INSERT OR REPLACE INTO Settings (key, value)
                VALUES ('gemini_api_key', ?)
            `,
            parameters: [newApiKey]
        });
        
        apiKey = newApiKey;
        showNotification('API key saved successfully');
        hideSettingsDialog();
    } catch (error) {
        console.error('Error saving API key:', error);
        showErrorNotification('Failed to save API key');
    }
}

// Show Settings Dialog
function showSettingsDialog() {
    if (apiKey) {
        apiKeyInput.value = apiKey;
    }
    
    settingsDialog.classList.add('active');
}

// Hide Settings Dialog
function hideSettingsDialog() {
    settingsDialog.classList.remove('active');
}

// Load Conversations
async function loadConversations() {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT 
                    c.id, 
                    c.title, 
                    c.created_at, 
                    c.updated_at,
                    (SELECT text FROM Messages 
                     WHERE conversation_id = c.id 
                     ORDER BY timestamp DESC LIMIT 1) as last_message
                FROM Conversations c
                ORDER BY c.updated_at DESC
            `
        });
        
        conversations = result;
        renderConversationList(conversations);
    } catch (error) {
        console.error('Error loading conversations:', error);
        showErrorNotification('Failed to load conversations');
    }
}

// Load All Tags for Filter
async function loadAllTags() {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT DISTINCT name
                FROM Tags
                ORDER BY name
            `
        });
        
        allTags = result.map(tag => tag.name);
        populateTagsFilter(allTags);
    } catch (error) {
        console.error('Error loading all tags:', error);
        showErrorNotification('Failed to load tags for filter');
    }
}

// Populate Tags Filter Dropdown
function populateTagsFilter(tags) {
    // Clear current options except the first one
    while (tagsFilterSelect.options.length > 1) {
        tagsFilterSelect.remove(1);
    }
    
    // Add tag options
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagsFilterSelect.appendChild(option);
    });
}

// Filter Conversations by Tag
async function filterConversationsByTag() {
    const selectedTag = tagsFilterSelect.value;
    
    if (!selectedTag) {
        // If no tag selected, show all conversations
        renderConversationList(conversations);
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
        
        renderConversationList(result);
    } catch (error) {
        console.error('Error filtering conversations by tag:', error);
        showErrorNotification('Failed to filter conversations');
    }
}

// Load Conversation Links
async function loadConversationLinks() {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT source_conversation_id, target_conversation_id
                FROM ConversationLinks
            `
        });
        
        conversationLinks = result;
    } catch (error) {
        console.error('Error loading conversation links:', error);
        showErrorNotification('Failed to load conversation links');
    }
}

// Initialize Mind Map
function initializeMindMap() {
    if (conversations.length === 0) {
        showEmptyMapMessage();
        return;
    }
    
    // Clear previous content
    g.selectAll('*').remove();
    
    // Prepare data for D3 force layout
    const nodes = conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        lastUpdate: conv.updated_at
    }));
    
    const links = conversationLinks.map(link => ({
        source: link.source_conversation_id,
        target: link.target_conversation_id
    }));
    
    // Create force simulation
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(svg.node().clientWidth / 2, svg.node().clientHeight / 2))
        .force('collision', d3.forceCollide().radius(50))
        .on('tick', ticked);
    
    // Create links
    const link = g.selectAll('.map-link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'map-link')
        .attr('stroke-width', 2);
    
    // Create nodes
    const node = g.selectAll('.map-node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'map-node')
        .attr('data-id', d => d.id)
        .on('click', (event, d) => {
            openConversationDialog(d.id);
        });
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 40)
        .attr('fill', 'rgba(74, 144, 226, 0.7)')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    
    // Add text to nodes
    node.append('text')
        .attr('dy', 0)
        .text(d => {
            // Truncate long titles
            return d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title;
        });
    
    // Add drag behavior
    node.call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Tick function to update positions
    function ticked() {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('transform', d => `translate(${d.x}, ${d.y})`);
    }
    
    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Show Empty Map Message
function showEmptyMapMessage() {
    g.selectAll('*').remove();
    
    g.append('text')
        .attr('x', svg.node().clientWidth / 2)
        .attr('y', svg.node().clientHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '18px')
        .text('No conversations yet. Click the + button to create one!');
}

// Zoom Map
function zoomMap(scale) {
    const newScale = transform.k * scale;
    if (newScale < 0.1 || newScale > 3) return;
    
    svg.transition().duration(300).call(
        zoom.transform,
        d3.zoomIdentity
            .translate(transform.x, transform.y)
            .scale(newScale)
    );
}

// Reset Map View
function resetMapView() {
    svg.transition().duration(500).call(
        zoom.transform,
        d3.zoomIdentity
    );
}

// Open Conversation Dialog
async function openConversationDialog(conversationId) {
    try {
        // Update current conversation ID
        currentConversationId = conversationId;
        
        // Get conversation details
        const result = await invoke('read_query', {
            query: `
                SELECT id, title, created_at, updated_at
                FROM Conversations
                WHERE id = ?
            `,
            parameters: [conversationId.toString()]
        });
        
        if (result.length > 0) {
            const conversation = result[0];
            
            // Update dialog title
            dialogTitle.textContent = conversation.title;
            
            // Load messages for this conversation
            await loadMessages(conversationId);
            
            // Load tags for this conversation
            await loadTags(conversationId);
            
            // Highlight selected node in the map
            highlightSelectedNode(conversationId);
            
            // Show dialog
            conversationDialog.classList.add('active');
        }
    } catch (error) {
        console.error('Error opening conversation dialog:', error);
        showErrorNotification('Failed to open conversation');
    }
}

// Close Conversation Dialog
function closeConversationDialog() {
    conversationDialog.classList.remove('active');
    currentConversationId = null;
    
    // Remove highlight from nodes
    d3.selectAll('.map-node').classed('selected', false);
    d3.selectAll('.map-link').classed('highlighted', false);
}

// Highlight Selected Node
function highlightSelectedNode(conversationId) {
    // Remove previous selection
    d3.selectAll('.map-node').classed('selected', false);
    d3.selectAll('.map-link').classed('highlighted', false);
    
    // Add selected class to current node
    const selectedNode = d3.select(`.map-node[data-id="${conversationId}"]`);
    selectedNode.classed('selected', true);
    
    // Highlight connected links
    const connectedLinks = conversationLinks.filter(
        link => link.source_conversation_id === conversationId || 
                link.target_conversation_id === conversationId
    );
    
    connectedLinks.forEach(link => {
        d3.selectAll('.map-link')
            .filter(d => 
                (d.source.id === link.source_conversation_id && 
                 d.target.id === link.target_conversation_id) ||
                (d.source.id === link.target_conversation_id && 
                 d.target.id === link.source_conversation_id)
            )
            .classed('highlighted', true);
    });
}

// Toggle Sidebar
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
}

// Render Conversation List
function renderConversationList(conversationsToRender) {
    // Clear current list
    conversationList.innerHTML = '';
    
    if (conversationsToRender.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'conversation-empty-state';
        emptyState.textContent = 'No conversations found';
        conversationList.appendChild(emptyState);
        return;
    }
    
    // Add conversation items
    conversationsToRender.forEach(conversation => {
        const template = conversationItemTemplate.content.cloneNode(true);
        const conversationItem = template.querySelector('.conversation-item');
        
        conversationItem.dataset.id = conversation.id;
        conversationItem.querySelector('.conversation-title').textContent = conversation.title;
        conversationItem.querySelector('.conversation-preview').textContent = conversation.last_message || 'No messages yet';
        
        // Format date
        const date = new Date(conversation.updated_at);
        conversationItem.querySelector('.conversation-date').textContent = formatDate(date);
        
        // Add active class if this is the current conversation
        if (conversation.id === currentConversationId) {
            conversationItem.classList.add('active');
        }
        
        // Add click event listener
        conversationItem.addEventListener('click', () => {
            openConversationDialog(conversation.id);
        });
        
        conversationList.appendChild(conversationItem);
    });
}

// Format Date
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

// Create New Conversation
async function createNewConversation() {
    try {
        const title = `New Conversation ${new Date().toLocaleString()}`;
        
        const result = await invoke('write_query', {
            query: `
                INSERT INTO Conversations (title, created_at, updated_at)
                VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `,
            parameters: [title]
        });
        
        // Get the ID of the new conversation
        const newConversationId = result.lastInsertRowid;
        
        // Refresh the conversation list
        await loadConversations();
        
        // Refresh the mind map
        await loadConversationLinks();
        initializeMindMap();
        
        // Open the new conversation
        openConversationDialog(newConversationId);
    } catch (error) {
        console.error('Error creating new conversation:', error);
        showErrorNotification('Failed to create a new conversation');
    }
}

// Load Messages
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
        
        messages = result;
        renderMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
        showErrorNotification('Failed to load messages');
    }
}

// Render Messages
function renderMessages(messagesToRender) {
    // Clear current messages
    messagesContainer.innerHTML = '';
    
    if (messagesToRender.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'messages-empty-state';
        emptyState.textContent = 'No messages yet. Start a conversation!';
        messagesContainer.appendChild(emptyState);
        return;
    }
    
    // Add message items
    messagesToRender.forEach(message => {
        const template = messageTemplate.content.cloneNode(true);
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
        
        messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
async function sendMessage(event) {
    event.preventDefault();
    
    if (!currentConversationId) {
        showErrorNotification('Please select a conversation first');
        return;
    }
    
    const messageText = messageInput.value.trim();
    if (!messageText) {
        // Show warning for empty message
        showWarningNotification('Please enter a message before sending');
        return;
    }
    
    try {
        // Save user message to database
        await invoke('write_query', {
            query: `
                INSERT INTO Messages (conversation_id, sender, text, timestamp)
                VALUES (?, 'user', ?, CURRENT_TIMESTAMP)
            `,
            parameters: [currentConversationId.toString(), messageText]
        });
        
        // Update conversation's updated_at timestamp
        await invoke('write_query', {
            query: `
                UPDATE Conversations
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            parameters: [currentConversationId.toString()]
        });
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Reload messages
        await loadMessages(currentConversationId);
        
        // Get AI response using Gemini API
        await getAIResponse(messageText);
        
        // Refresh conversation list and mind map
        await loadConversations();
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorNotification('Failed to send message');
    }
}

// Get AI Response
async function getAIResponse(userMessage) {
    try {
        // Check if API key is available
        if (!apiKey) {
            showErrorNotification('Gemini API key is missing. Please set it in Settings.');
            await invoke('write_query', {
                query: `
                    INSERT INTO Messages (conversation_id, sender, text, timestamp)
                    VALUES (?, 'ai', ?, CURRENT_TIMESTAMP)
                `,
                parameters: [currentConversationId.toString(), "ERROR: Gemini API key is not set. Please configure it in the settings."]
            });
            
            await loadMessages(currentConversationId);
            return;
        }
        
        // In a real app, you'd call the Gemini API here
        // For now, we'll simulate a response
        let simulatedResponse = `This is a simulated AI response to: "${userMessage}"`;
        
        // Add some delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Save AI response to database
        await invoke('write_query', {
            query: `
                INSERT INTO Messages (conversation_id, sender, text, timestamp)
                VALUES (?, 'ai', ?, CURRENT_TIMESTAMP)
            `,
            parameters: [currentConversationId.toString(), simulatedResponse]
        });
        
        // Update conversation's updated_at timestamp
        await invoke('write_query', {
            query: `
                UPDATE Conversations
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,
            parameters: [currentConversationId.toString()]
        });
        
        // Reload messages
        await loadMessages(currentConversationId);
        
        // Refresh conversation list
        await loadConversations();
    } catch (error) {
        console.error('Error getting AI response:', error);
        showErrorNotification('Failed to get AI response');
    }
}

// Edit Message
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
                await loadMessages(currentConversationId);
                
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

// Delete Message
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
        await loadMessages(currentConversationId);
        
        // Refresh conversation list to update preview
        await loadConversations();
    } catch (error) {
        console.error('Error deleting message:', error);
        showErrorNotification('Failed to delete message');
    }
}

// Search Conversations
async function searchConversations() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        // If search is empty, show all conversations
        renderConversationList(conversations);
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
                ORDER BY c.updated_at DESC
            `,
            parameters: [`%${searchTerm}%`, `%${searchTerm}%`]
        });
        
        renderConversationList(result);
    } catch (error) {
        console.error('Error searching conversations:', error);
        showErrorNotification('Failed to search conversations');
    }
}

// Load Tags
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
        
        tags = result;
        renderTags(tags);
    } catch (error) {
        console.error('Error loading tags:', error);
        showErrorNotification('Failed to load tags');
    }
}

// Render Tags
function renderTags(tagsToRender) {
    // Clear current tags
    conversationTags.innerHTML = '';
    
    if (tagsToRender.length === 0) {
        return;
    }
    
    // Add tag items
    tagsToRender.forEach(tag => {
        const template = tagTemplate.content.cloneNode(true);
        const tagElement = template.querySelector('.tag');
        
        tagElement.dataset.id = tag.id;
        tagElement.querySelector('.tag-text').textContent = tag.name;
        
        // Add remove event listener
        const removeBtn = tagElement.querySelector('.tag-remove');
        removeBtn.addEventListener('click', () => {
            removeTag(tag.id);
        });
        
        // Add tag element
        conversationTags.appendChild(tagElement);
    });
}

// Show Add Tag Dialog
function showAddTagDialog() {
    if (!currentConversationId) {
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
    
    if (allTags.length > 0) {
        const existingTagsLabel = document.createElement('p');
        existingTagsLabel.textContent = 'Or select from existing tags:';
        existingTagsContainer.appendChild(existingTagsLabel);
        
        const tagsList = document.createElement('div');
        tagsList.className = 'tags-list';
        
        allTags.forEach(tagName => {
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

// Add Tag
async function addTag(tagName) {
    try {
        await invoke('write_query', {
            query: `
                INSERT OR IGNORE INTO Tags (name, conversation_id)
                VALUES (?, ?)
            `,
            parameters: [tagName, currentConversationId.toString()]
        });
        
        // Reload tags for current conversation
        await loadTags(currentConversationId);
        
        // Reload all tags for filter
        await loadAllTags();
        
        // Refresh mind map to reflect updated tags
        initializeMindMap();
    } catch (error) {
        console.error('Error adding tag:', error);
        showErrorNotification('Failed to add tag');
    }
}

// Remove Tag
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
        await loadTags(currentConversationId);
        
        // Reload all tags for filter
        await loadAllTags();
    } catch (error) {
        console.error('Error removing tag:', error);
        showErrorNotification('Failed to remove tag');
    }
}

// Show Edit Title Dialog
function showEditTitleDialog() {
    if (!currentConversationId) {
        showErrorNotification('Please select a conversation first');
        return;
    }
    
    const newTitle = prompt('Enter a new title:', dialogTitle.textContent);
    if (!newTitle || newTitle.trim() === '') return;
    
    updateConversationTitle(newTitle.trim());
}

// Update Conversation Title
async function updateConversationTitle(newTitle) {
    try {
        await invoke('write_query', {
            query: `
                UPDATE Conversations
                SET title = ?
                WHERE id = ?
            `,
            parameters: [newTitle, currentConversationId.toString()]
        });
        
        // Update dialog title
        dialogTitle.textContent = newTitle;
        
        // Refresh conversation list
        await loadConversations();
        
        // Refresh mind map
        initializeMindMap();
    } catch (error) {
        console.error('Error updating conversation title:', error);
        showErrorNotification('Failed to update title');
    }
}

// Show Link Conversation Dialog
async function showLinkConversationDialog() {
    if (!currentConversationId) {
        showErrorNotification('Please select a conversation first');
        return;
    }
    
    try {
        // Get all conversations except the current one
        const result = await invoke('read_query', {
            query: `
                SELECT id, title
                FROM Conversations
                WHERE id != ?
                ORDER BY updated_at DESC
            `,
            parameters: [currentConversationId.toString()]
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
            convItem.textContent = conv.title;
            
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
                conversationsList.querySelectorAll('.conversation-link-item.selected')
            ).map(item => parseInt(item.dataset.id));
            
            if (selectedIds.length === 0) {
                showWarningNotification('Please select at least one conversation to link');
                return;
            }
            
            // Create links for each selected conversation
            for (const targetId of selectedIds) {
                await linkConversations(currentConversationId, targetId);
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

// Link Conversations
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
        initializeMindMap();
        
        // If dialog is open, refresh the highlighted node
        if (currentConversationId) {
            highlightSelectedNode(currentConversationId);
        }
        
        showNotification('Conversations linked successfully');
    } catch (error) {
        console.error('Error linking conversations:', error);
        showErrorNotification('Failed to link conversations');
    }
}

// Show Notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Show Error Notification
function showErrorNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 4000);
}

// Show Warning Notification
function showWarningNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification warning';
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after timeout
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}