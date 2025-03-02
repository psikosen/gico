// Import modules
import { invoke } from './tauri-bridge.js';
import logger from './logger.js';
import db from './database.js';
import geminiAPI from './gemini-api.js';
import settings from './settings.js';
import { runStartupDiagnostics, attemptAutoFixes } from './diagnostics.js';

// Initialize logger with enhanced debugging
logger.info('Application starting with enhanced debugging');

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
const sendBtn = document.getElementById('send-btn');
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
const closeSettingsBtnAlt = document.getElementById('close-settings-btn-alt');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarksDialog = document.getElementById('bookmarks-dialog');
const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
const bookmarksList = document.getElementById('bookmarks-list');

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
let tagLinks = []; // Array to store links between tags
let simulation = null;
let transform = { x: 0, y: 0, k: 1 }; // For zoom and pan
let apiKey = ''; // Store the Gemini API key
let showTagsOnly = false; // Toggle to show only tagged conversations
let isProcessingMessage = false; // Flag to track if a message is being processed

// D3 Selections
let svg = d3.select('#mind-map-svg');
let g = d3.select('#map-container');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
sidebarToggle.addEventListener('click', toggleSidebar);
if (newConversationBtn) newConversationBtn.addEventListener('click', createNewConversation);
if (addConvoBtn) addConvoBtn.addEventListener('click', createNewConversation);
if (searchInput) searchInput.addEventListener('input', searchConversations);
if (linkConversationBtn) linkConversationBtn.addEventListener('click', showLinkConversationDialog);
if (addTagBtn) addTagBtn.addEventListener('click', showAddTagDialog);
if (editTitleBtn) editTitleBtn.addEventListener('click', showEditTitleDialog);
if (closeDialogBtn) closeDialogBtn.addEventListener('click', closeConversationDialog);
if (messageForm) messageForm.addEventListener('submit', sendMessage);
if (listViewBtn) listViewBtn.addEventListener('click', toggleSidebar);
if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomMap(1.2));
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomMap(0.8));
if (resetViewBtn) resetViewBtn.addEventListener('click', resetMapView);
if (tagsFilterSelect) tagsFilterSelect.addEventListener('change', filterConversationsByTag);
if (settingsBtn) settingsBtn.addEventListener('click', showSettingsDialog);
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', hideSettingsDialog);
if (closeSettingsBtnAlt) closeSettingsBtnAlt.addEventListener('click', hideSettingsDialog);
if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', saveApiKey);
if (bookmarkBtn) bookmarkBtn.addEventListener('click', toggleBookmarksDialog);
if (closeBookmarksBtn) closeBookmarksBtn.addEventListener('click', hideBookmarksDialog);

// Zoom behavior
const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
        transform = event.transform;
        g.attr('transform', event.transform);
    });

svg.call(zoom);

// Initialize Application with enhanced diagnostics
async function initializeApp() {
    try {
        logger.info("Initializing application with enhanced debugging...");
        
        // Run startup diagnostics first
        logger.info("Running startup diagnostics...");
        await runStartupDiagnostics();
        
        // Attempt to fix any issues automatically
        await attemptAutoFixes();
        
        // Initialize database tables if they don't exist
        logger.info("Initializing database tables...");
        await initializeDatabase();
        
        // Load API key from local storage if available
        logger.info("Loading API key...");
        await loadApiKey();
        
        // Load conversations
        logger.info("Loading conversations...");
        await loadConversations();
        
        // Load conversation links
        logger.info("Loading conversation links...");
        await loadConversationLinks();
        
        // Load all tags for filter
        logger.info("Loading tags...");
        await loadAllTags();
        
        // Load tag links
        logger.info("Loading tag links...");
        await loadTagLinks();
        
        // Initialize mind map
        logger.info("Initializing mind map...");
        initializeMindMap();
        
        // Verify critical DOM elements are setup properly
        verifyDomElements();
        
        // Verify critical event listeners
        verifyEventListeners();
        
        // Auto-resize message input
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                messageInput.style.height = 'auto';
                messageInput.style.height = messageInput.scrollHeight + 'px';
            });
            logger.debug('Added auto-resize to message input');
        } else {
            logger.warn('Message input element not found');
        }
        
        logger.info("Application initialized successfully!");
    } catch (error) {
        logger.error('Error initializing app:', error);
        showErrorNotification('Failed to initialize the application: ' + error.message);
    }
}

// Verify critical DOM elements
function verifyDomElements() {
    logger.info('Verifying critical DOM elements...');
    
    // Check critical buttons
    const criticalButtons = [
        { id: 'new-conversation-btn', name: 'New Conversation Button' },
        { id: 'add-convo-btn', name: 'Add Conversation Button' },
        { id: 'send-btn', name: 'Send Button' }
    ];
    
    criticalButtons.forEach(button => {
        const element = document.getElementById(button.id);
        if (!element) {
            logger.error(`Critical button missing: ${button.name} (id: ${button.id})`);
        } else {
            logger.debug(`Found critical button: ${button.name}`);
            
            // Check if button is properly visible and enabled
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || element.disabled) {
                logger.warn(`Button ${button.id} may be hidden or disabled:`, {
                    display: style.display,
                    visibility: style.visibility,
                    disabled: element.disabled
                });
            }
        }
    });
}

// Verify critical event listeners
function verifyEventListeners() {
    logger.info('Verifying critical event listeners...');
    
    // Verify new conversation buttons
    if (newConversationBtn) {
        // Re-attach for safety
        newConversationBtn.removeEventListener('click', createNewConversation);
        newConversationBtn.addEventListener('click', createNewConversation);
        logger.debug('Re-attached event listener to newConversationBtn');
    }
    
    if (addConvoBtn) {
        // Re-attach for safety
        addConvoBtn.removeEventListener('click', createNewConversation);
        addConvoBtn.addEventListener('click', createNewConversation);
        logger.debug('Re-attached event listener to addConvoBtn');
    }
    
    // Verify message form submit
    if (messageForm) {
        // Re-attach for safety
        messageForm.removeEventListener('submit', sendMessage);
        messageForm.addEventListener('submit', sendMessage);
        logger.debug('Re-attached event listener to messageForm');
    }
    
    // Expose key functions for diagnostics
    window.createNewConversation = createNewConversation;
    window.sendMessage = sendMessage;
    window.openConversationDialog = openConversationDialog;
}

// Initialize Database
async function initializeDatabase() {
    try {
        console.log("Creating database tables if they don't exist...");
        
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
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw new Error('Failed to initialize database: ' + error.message);
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

// Toggle Bookmarks Dialog
async function toggleBookmarksDialog() {
    if (bookmarksDialog.classList.contains('active')) {
        hideBookmarksDialog();
    } else {
        await loadBookmarkedConversations();
        bookmarksDialog.classList.add('active');
    }
}

// Hide Bookmarks Dialog
function hideBookmarksDialog() {
    bookmarksDialog.classList.remove('active');
}

// Load Bookmarked Conversations
async function loadBookmarkedConversations() {
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
        
        // Render bookmarks list
        bookmarksList.innerHTML = '';
        
        if (result.length === 0) {
            bookmarksList.innerHTML = '<div class="bookmark-empty-state">No bookmarked conversations yet</div>';
            return;
        }
        
        result.forEach(conv => {
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
            
            bookmarksList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading bookmarked conversations:', error);
        showErrorNotification('Failed to load bookmarks');
    }
}

// Toggle Bookmark Status
async function toggleBookmark(conversationId) {
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
            
            // Show confirmation
            const message = newStatus 
                ? 'Conversation bookmarked' 
                : 'Bookmark removed';
            showNotification(message);
            
            // Update bookmark button if needed
            if (document.querySelector('.bookmark-status-btn')) {
                const btn = document.querySelector('.bookmark-status-btn i');
                if (newStatus) {
                    btn.classList.remove('far');
                    btn.classList.add('fas');
                } else {
                    btn.classList.remove('fas');
                    btn.classList.add('far');
                }
            }
        }
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        showErrorNotification('Failed to update bookmark');
    }
}

// Load Conversations
async function loadConversations() {
    try {
        console.log("Loading conversations from database...");
        
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
        
        console.log("Loaded conversations:", result);
        conversations = result;
        renderConversationList(conversations);
    } catch (error) {
        console.error('Error loading conversations:', error);
        showErrorNotification('Failed to load conversations: ' + error.message);
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

// Load Tag Links
async function loadTagLinks() {
    try {
        const result = await invoke('read_query', {
            query: `
                SELECT tl.source_tag_id, tl.target_tag_id, 
                       t1.name as source_tag_name, t2.name as target_tag_name,
                       t1.conversation_id as source_conversation_id, 
                       t2.conversation_id as target_conversation_id
                FROM TagLinks tl
                JOIN Tags t1 ON tl.source_tag_id = t1.id
                JOIN Tags t2 ON tl.target_tag_id = t2.id
            `
        });
        
        tagLinks = result;
    } catch (error) {
        console.error('Error loading tag links:', error);
        showErrorNotification('Failed to load tag links');
    }
}

// Populate Tags Filter Dropdown
function populateTagsFilter(tags) {
    if (!tagsFilterSelect) return;
    
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
        showTagsOnly = false;
        initializeMindMap();
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
        
        // Set flag to show only tagged conversations in mind map
        showTagsOnly = true;
        
        // Update mind map to show only tagged conversations
        filterMindMapByTag(selectedTag);
    } catch (error) {
        console.error('Error filtering conversations by tag:', error);
        showErrorNotification('Failed to filter conversations');
    }
}

// Filter Mind Map by Tag
function filterMindMapByTag(tagName) {
    // If no specific tag selected, show full map
    if (!tagName) {
        initializeMindMap();
        return;
    }
    
    // Find all conversations with the selected tag
    const taggedConversationIds = new Set();
    
    // Re-initialize the mind map with filtered nodes
    initializeMindMap(tagName);
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
function initializeMindMap(filterTag) {
    if (conversations.length === 0) {
        showEmptyMapMessage();
        return;
    }
    
    // Clear previous content
    g.selectAll('*').remove();
    
    // Filter conversations if a tag is selected
    let filteredConversations = conversations;
    let filteredLinks = conversationLinks;
    
    if (filterTag) {
        // Get all conversation IDs with the selected tag
        const taggedConversationIds = new Set();
        
        // If we have a tag filter, get all conversations with that tag
        invoke('read_query', {
            query: `
                SELECT conversation_id
                FROM Tags
                WHERE name = ?
            `,
            parameters: [filterTag]
        }).then(result => {
            result.forEach(row => taggedConversationIds.add(row.conversation_id));
            
            // Filter conversations
            filteredConversations = conversations.filter(conv => 
                taggedConversationIds.has(conv.id)
            );
            
            // Filter links to only include tagged conversations
            filteredLinks = conversationLinks.filter(link => 
                taggedConversationIds.has(link.source_conversation_id) && 
                taggedConversationIds.has(link.target_conversation_id)
            );
            
            // Update the mind map with filtered data
            updateMindMapVisualization(filteredConversations, filteredLinks);
        }).catch(error => {
            console.error('Error filtering mind map by tag:', error);
        });
    } else {
        // No filter, use all data
        updateMindMapVisualization(filteredConversations, filteredLinks);
    }
}

function updateMindMapVisualization(nodes, links) {
    // Prepare data for D3 force layout
    const nodeData = nodes.map(conv => ({
        id: conv.id,
        title: conv.title,
        lastUpdate: conv.updated_at,
        bookmarked: conv.bookmarked,
        type: 'conversation'
    }));
    
    const linkData = links.map(link => ({
        source: link.source_conversation_id,
        target: link.target_conversation_id,
        type: 'conversation'
    }));
    
    // Create force simulation
    simulation = d3.forceSimulation(nodeData)
        .force('link', d3.forceLink(linkData).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(svg.node().clientWidth / 2, svg.node().clientHeight / 2))
        .force('collision', d3.forceCollide().radius(50))
        .on('tick', ticked);
    
    // Create links
    const link = g.selectAll('.map-link')
        .data(linkData)
        .enter()
        .append('line')
        .attr('class', 'map-link')
        .attr('stroke-width', 2);
    
    // Create nodes
    const node = g.selectAll('.map-node')
        .data(nodeData)
        .enter()
        .append('g')
        .attr('class', 'map-node')
        .attr('data-id', d => d.id)
        .attr('data-type', d => d.type)
        .on('click', (event, d) => {
            if (d.type === 'conversation') {
                openConversationDialog(d.id);
            }
        });
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', 40)
        .attr('fill', d => d.type === 'tag' ? 'rgba(80, 227, 194, 0.7)' : 'rgba(74, 144, 226, 0.7)')
        .attr('stroke', 'white')
        .attr('stroke-width', 2);
    
    // Add text to nodes
    node.append('text')
        .attr('dy', 0)
        .text(d => {
            // Truncate long titles
            return d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title;
        });
    
    // Add bookmark indicators
    node.filter(d => d.bookmarked)
        .append('text')
        .attr('class', 'bookmark-indicator')
        .attr('x', 25)
        .attr('y', -30)
        .attr('font-size', '14px')
        .attr('fill', '#FFD700')
        .attr('text-anchor', 'middle')
        .text('★');
    
    // Add drag behavior
    node.call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));
    
    // Add tag indicators and tag names to conversations with tags
    node.each(function(d) {
        if (d.type === 'conversation') {
            // Check if this conversation has tags
            invoke('read_query', {
                query: `
                    SELECT name
                    FROM Tags
                    WHERE conversation_id = ?
                `,
                parameters: [d.id.toString()]
            }).then(result => {
                if (result.length > 0) {
                    // Add tag names below node
                    const tagNames = d3.select(this).append('g')
                        .attr('class', 'tag-names')
                        .attr('transform', 'translate(0, 55)');
                    
                    // Show up to 3 tags, with ellipsis if more
                    const displayTags = result.slice(0, 3);
                    displayTags.forEach((tag, i) => {
                        tagNames.append('text')
                            .attr('y', i * 15)
                            .attr('text-anchor', 'middle')
                            .text(`#${tag.name}`);
                    });
                    
                    if (result.length > 3) {
                        tagNames.append('text')
                            .attr('y', 3 * 15)
                            .attr('text-anchor', 'middle')
                            .text('...');
                    }
                    
                    // Add a small tag indicator
                    d3.select(this).append('circle')
                        .attr('class', 'tag-indicator')
                        .attr('r', 8)
                        .attr('cx', 25)
                        .attr('cy', -25)
                        .attr('fill', 'rgba(80, 227, 194, 0.9)')
                        .attr('stroke', 'white')
                        .attr('stroke-width', 1);
                    
                    // Add tag count
                    d3.select(this).append('text')
                        .attr('class', 'tag-count')
                        .attr('x', 25)
                        .attr('y', -25)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'central')
                        .attr('font-size', '10px')
                        .attr('fill', 'white')
                        .text(result.length);
                }
            }).catch(error => {
                console.error('Error checking for tags:', error);
            });
        }
    });
    
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

// Zoom to Node
function zoomToNode(nodeId) {
    const node = d3.select(`.map-node[data-id="${nodeId}"]`);
    if (!node.empty()) {
        // Get node's position data
        const nodeData = node.datum();
        if (nodeData && nodeData.x && nodeData.y) {
            // Calculate center position of the viewport
            const width = svg.node().clientWidth;
            const height = svg.node().clientHeight;
            
            // Calculate new transform
            const scale = 1.5; // Zoom level
            const x = width / 2 - nodeData.x * scale;
            const y = height / 2 - nodeData.y * scale;
            
            // Apply transform with transition
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
                    .translate(x, y)
                    .scale(scale)
            );
            
            // Update our saved transform
            transform = { x, y, k: scale };
        }
    }
}

// Open Conversation Dialog
async function openConversationDialog(conversationId) {
    try {
        console.log(`Opening conversation dialog for ID: ${conversationId}`);
        
        // Update current conversation ID
        currentConversationId = conversationId;
        
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
            dialogTitle.textContent = conversation.title;
            
            // Add bookmark button if not present
            if (!document.querySelector('.bookmark-status-btn')) {
                const bookmarkStatusBtn = document.createElement('button');
                bookmarkStatusBtn.className = 'dialog-action-btn bookmark-status-btn';
                bookmarkStatusBtn.title = conversation.bookmarked ? 'Remove Bookmark' : 'Bookmark';
                
                const bookmarkIcon = document.createElement('i');
                bookmarkIcon.className = conversation.bookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
                
                bookmarkStatusBtn.appendChild(bookmarkIcon);
                bookmarkStatusBtn.addEventListener('click', () => toggleBookmark(conversationId));
                
                // Insert before the close button
                const actions = document.querySelector('.dialog-actions');
                actions.insertBefore(bookmarkStatusBtn, document.getElementById('close-dialog-btn'));
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
            highlightSelectedNode(conversationId);
            
            // Show dialog
            conversationDialog.classList.add('active');
        } else {
            console.error(`No conversation found with ID: ${conversationId}`);
            showErrorNotification(`Conversation not found: ${conversationId}`);
        }
    } catch (error) {
        console.error('Error opening conversation dialog:', error);
        showErrorNotification('Failed to open conversation: ' + error.message);
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
    
    // Zoom to the selected node
    zoomToNode(conversationId);
}

// Toggle Sidebar
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
}

// Render Conversation List
function renderConversationList(conversationsToRender) {
    if (!conversationList) return;
    
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
            const currentActive = conversationList.querySelector('.conversation-item.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            conversationItem.classList.add('active');
            
            // Then open the dialog and zoom to node
            openConversationDialog(conversation.id);
        });
        
        conversationList.appendChild(conversationItem);
    });
}

// Add Tag Indicators to List Item
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
        console.log("Creating new conversation...");
        
        const title = `New Conversation ${new Date().toLocaleString()}`;
        
        const result = await invoke('write_query', {
            query: `
                INSERT INTO Conversations (title, created_at, updated_at, bookmarked)
                VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
            `,
            parameters: [title]
        });
        
        // Get the ID of the new conversation
        const newConversationId = result.lastInsertRowid;
        console.log(`Created new conversation with ID: ${newConversationId}`);
        
        // Refresh the conversation list
        await loadConversations();
        
        // Refresh the mind map
        await loadConversationLinks();
        initializeMindMap();
        
        // Open the new conversation
        openConversationDialog(newConversationId);
    } catch (error) {
        console.error('Error creating new conversation:', error);
        showErrorNotification('Failed to create a new conversation: ' + error.message);
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
    if (!messagesContainer) return;
    
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
    
    if (isProcessingMessage) {
        return; // Prevent multiple submissions
    }
    
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
        // Set processing flag
        isProcessingMessage = true;
        
        // Change button state to waiting
        if (window.handleButtonState) {
            window.handleButtonState('waiting');
        }
        sendBtn.disabled = true;
        
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
        
        // Change button state to activated
        if (window.handleButtonState) {
            window.handleButtonState('activated');
        }
        
        // After a delay, reset button state
        setTimeout(() => {
            if (window.handleButtonState) {
                window.handleButtonState('activate');
            }
            sendBtn.disabled = false;
            isProcessingMessage = false;
        }, 1500);
        
    } catch (error) {
        console.error('Error sending message:', error);
        showErrorNotification('Failed to send message: ' + error.message);
        
        // Reset button state
        if (window.handleButtonState) {
            window.handleButtonState('activate');
        }
        sendBtn.disabled = false;
        isProcessingMessage = false;
    }
}

// Get AI Response with Streaming
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
        messagesContainer.appendChild(loadingMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Prepare previous messages context if any
        const previousMessages = await invoke('read_query', {
            query: `
                SELECT sender, text
                FROM Messages
                WHERE conversation_id = ?
                ORDER BY timestamp ASC
                LIMIT 10
            `,
            parameters: [currentConversationId.toString()]
        });
        
        // Format messages for Gemini API
        const contents = [];
        
        // Add previous messages to the context
        previousMessages.forEach(msg => {
            contents.push({
                role: msg.sender.toLowerCase() === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        });
        
        // Add current user message if it's not already included
        const lastMessage = previousMessages[previousMessages.length - 1];
        if (!lastMessage || lastMessage.text !== userMessage || lastMessage.sender.toLowerCase() !== 'user') {
            contents.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });
        }
        
        // Create a new message in the database to store the AI response
        const messageResult = await invoke('write_query', {
            query: `
                INSERT INTO Messages (conversation_id, sender, text, timestamp)
                VALUES (?, 'ai', '', CURRENT_TIMESTAMP)
            `,
            parameters: [currentConversationId.toString()]
        });
        
        const aiMessageId = messageResult.lastInsertRowid;
        
        try {
            // Call Gemini API with streaming
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contents })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            // Remove loading message
            messagesContainer.removeChild(loadingMessage);
            
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
            messagesContainer.appendChild(messageElement);
            
            // Add event listeners for edit and delete
            editBtn.addEventListener('click', () => {
                editMessage(aiMessageId);
            });
            
            deleteBtn.addEventListener('click', () => {
                deleteMessage(aiMessageId);
            });
            
            // Process the stream
            const reader = response.body.getReader();
            let fullResponse = '';
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Convert the chunk to text
                const chunk = new TextDecoder().decode(value);
                
                // Parse the SSE data to extract the text
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                                const textChunk = data.candidates[0].content.parts[0].text;
                                fullResponse += textChunk;
                                
                                // Update the message content
                                messageContent.textContent = fullResponse;
                                
                                // Scroll to the bottom
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
            
            // Update the message in the database with the full response
            await invoke('write_query', {
                query: `
                    UPDATE Messages
                    SET text = ?
                    WHERE id = ?
                `,
                parameters: [fullResponse, aiMessageId.toString()]
            });
        } catch (apiError) {
            console.error('Error calling Gemini API:', apiError);
            
            // Remove loading message if it exists
            if (messagesContainer.contains(loadingMessage)) {
                messagesContainer.removeChild(loadingMessage);
            }
            
            // Create error message
            await invoke('write_query', {
                query: `
                    UPDATE Messages
                    SET text = ?
                    WHERE id = ?
                `,
                parameters: [`Error calling Gemini API: ${apiError.message}`, aiMessageId.toString()]
            });
            
            await loadMessages(currentConversationId);
            showErrorNotification(`API Error: ${apiError.message}`);
        } finally {
            // Update conversation's updated_at timestamp
            await invoke('write_query', {
                query: `
                    UPDATE Conversations
                    SET updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `,
                parameters: [currentConversationId.toString()]
            });
            
            // Refresh conversation list
            await loadConversations();
        }
    } catch (error) {
        console.error('Error getting AI response:', error);
        showErrorNotification('Failed to get AI response: ' + error.message);
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
    if (!conversationTags) return;
    
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
        const result = await invoke('write_query', {
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
        
        // Update the sidebar list to show tag indicators
        await loadConversations();
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
        
        // Refresh mind map
        initializeMindMap();
        
        // Update the sidebar list to show tag indicators
        await loadConversations();
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
    
    // Create a custom dialog for editing title
    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'custom-dialog';
    
    const dialogContent = document.createElement('div');
    dialogContent.className = 'custom-dialog-content';
    
    const header = document.createElement('h3');
    header.textContent = 'Edit Conversation Title';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = dialogTitle.textContent;
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
                SELECT id, title, bookmarked
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
            
            // Add bookmark indicator if bookmarked
            let titleText = conv.title;
            if (conv.bookmarked) {
                titleText = `★ ${titleText}`;
            }
            
            convItem.textContent = titleText;
            
            // Check if already linked
            const isLinked = conversationLinks.some(
                link => (link.source_conversation_id == currentConversationId && 
                         link.target_conversation_id == conv.id) ||
                        (link.source_conversation_id == conv.id && 
                         link.target_conversation_id == currentConversationId)
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