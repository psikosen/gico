/**
 * Diagnostics Module - Tools for troubleshooting app issues
 */
import { invoke } from './tauri-bridge.js';
import logger from './logger.js';
import db from './database.js';

// Run at startup to automatically diagnose and fix issues
export async function runStartupDiagnostics() {
    logger.info('Running startup diagnostics...');
    
    try {
        // Check DOM elements
        checkCriticalDomElements();
        
        // Check database connection
        await checkDatabaseConnection();
        
        // Check event listeners
        checkEventListeners();
        
        // Check for problematic DOM overlays
        checkOverlayElements();
        
        logger.info('Startup diagnostics completed successfully');
        return true;
    } catch (error) {
        logger.error('Startup diagnostics failed', { error });
        return false;
    }
}

// Check critical DOM elements
function checkCriticalDomElements() {
    logger.info('Checking critical DOM elements...');
    
    const criticalElements = [
        { id: 'new-conversation-btn', description: 'New Conversation button' },
        { id: 'add-convo-btn', description: 'Add Conversation button' },
        { id: 'message-form', description: 'Message form' },
        { id: 'message-input', description: 'Message input' },
        { id: 'send-btn', description: 'Send button' },
        { id: 'mind-map-svg', description: 'Mind map SVG container' },
        { id: 'map-container', description: 'Map container' },
        { id: 'conversation-list', description: 'Conversation list' }
    ];
    
    const missingElements = [];
    
    for (const element of criticalElements) {
        const domElement = document.getElementById(element.id);
        if (!domElement) {
            missingElements.push(element);
            logger.error(`Critical element missing: ${element.description} (id: ${element.id})`);
        } else {
            logger.debug(`Found critical element: ${element.description} (id: ${element.id})`);
            
            // Check visibility for buttons
            if (element.id.includes('btn')) {
                const style = window.getComputedStyle(domElement);
                if (style.display === 'none' || style.visibility === 'hidden' || domElement.disabled) {
                    logger.warn(`Button ${element.id} may be hidden or disabled`, {
                        display: style.display,
                        visibility: style.visibility,
                        disabled: domElement.disabled
                    });
                }
            }
        }
    }
    
    if (missingElements.length > 0) {
        logger.error('Missing critical elements', { missing: missingElements.map(e => e.id) });
        // Don't throw an error for now, just log it
    } else {
        logger.info('All critical DOM elements are present');
    }
}

// Check database connection
async function checkDatabaseConnection() {
    logger.info('Checking database connection...');
    
    try {
        // Check if the database is properly initialized
        if (!db.isInitialized) {
            logger.warn('Database not yet initialized, attempting initialization...');
            await db.initialize();
        }
        
        // Check if tables exist
        const tables = await db.listTables();
        logger.info('Database tables found', { tables });
        
        // Check for required tables
        const requiredTables = ['Conversations', 'Messages', 'ConversationLinks', 'Tags', 'Settings'];
        const missingTables = requiredTables.filter(table => !tables.includes(table));
        
        if (missingTables.length > 0) {
            logger.error('Missing required database tables', { missing: missingTables });
            throw new Error(`Missing database tables: ${missingTables.join(', ')}`);
        }
        
        // Check if we can read from the database
        const conversationsCount = await db.readQuery('SELECT COUNT(*) as count FROM Conversations');
        logger.info('Database read test succeeded', { 
            conversationsCount: conversationsCount[0].count 
        });
        
        return true;
    } catch (error) {
        logger.error('Database connection check failed', { error });
        throw error;
    }
}

// Check for event listeners
function checkEventListeners() {
    logger.info('Checking event listeners...');
    
    // Check key buttons
    const buttonIds = ['new-conversation-btn', 'add-convo-btn', 'send-btn'];
    
    buttonIds.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            if (typeof window.getEventListeners === 'function') {
                // Chrome DevTools API
                const listeners = window.getEventListeners(button);
                if (!listeners || !listeners.click || listeners.click.length === 0) {
                    logger.warn(`No click listeners on button: ${id}`);
                } else {
                    logger.debug(`Button ${id} has ${listeners.click.length} click listeners`);
                }
            } else {
                // Fallback for browsers without getEventListeners
                logger.debug(`Cannot verify event listeners on ${id} (getEventListeners not available)`);
                
                // Add event listener that will log when clicked (for diagnostic purposes)
                const originalOnClick = button.onclick;
                button.onclick = function(event) {
                    logger.info(`Button clicked: ${id}`);
                    if (originalOnClick) {
                        return originalOnClick.call(this, event);
                    }
                };
                logger.debug(`Added diagnostic click logger to ${id}`);
            }
        }
    });
    
    // Check message form
    const form = document.getElementById('message-form');
    if (form) {
        if (typeof window.getEventListeners === 'function') {
            const listeners = window.getEventListeners(form);
            if (!listeners || !listeners.submit || listeners.submit.length === 0) {
                logger.warn('No submit listeners on message form');
                
                // Try to fix by adding a basic submit handler
                form.addEventListener('submit', function(event) {
                    event.preventDefault();
                    logger.info('Form submitted via diagnostics handler');
                    // This is just for diagnostic purposes, not full functionality
                });
                logger.info('Added diagnostic submit handler to message form');
            } else {
                logger.debug(`Message form has ${listeners.submit.length} submit listeners`);
            }
        } else {
            logger.debug('Cannot verify form submit listeners (getEventListeners not available)');
        }
    }
}

// Check for overlay elements that might block clicks
function checkOverlayElements() {
    logger.info('Checking for problematic overlay elements...');
    
    // Look for modal/dialog elements that might be blocking inputs
    const overlays = document.querySelectorAll('.dialog, .modal, .overlay, [style*="position: absolute"], [style*="position: fixed"]');
    
    let activeOverlays = 0;
    overlays.forEach(overlay => {
        const style = window.getComputedStyle(overlay);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            activeOverlays++;
            logger.warn(`Active overlay element detected: ${overlay.id || overlay.className}`, {
                zIndex: style.zIndex,
                position: style.position,
                opacity: style.opacity
            });
            
            // Look for buttons within this overlay
            const overlayButtons = overlay.querySelectorAll('button');
            if (overlayButtons.length > 0) {
                logger.info(`Found ${overlayButtons.length} buttons within overlay`);
                
                overlayButtons.forEach(button => {
                    const buttonStyle = window.getComputedStyle(button);
                    if (buttonStyle.display === 'none' || buttonStyle.visibility === 'hidden' || button.disabled) {
                        logger.warn(`Button in overlay may be hidden or disabled:`, {
                            id: button.id,
                            class: button.className,
                            text: button.textContent.trim(),
                            display: buttonStyle.display,
                            visibility: buttonStyle.visibility
                        });
                    }
                });
            }
        }
    });
    
    if (activeOverlays === 0) {
        logger.info('No active overlay elements found');
    } else {
        logger.info(`Found ${activeOverlays} active overlay elements`);
    }
}

// Fix common issues
export async function attemptAutoFixes() {
    logger.info('Attempting automatic fixes for common issues...');
    
    try {
        // Fix 1: Ensure conversation dialog is hidden if we're not viewing a conversation
        const dialogElement = document.getElementById('conversation-dialog');
        if (dialogElement && dialogElement.classList.contains('active')) {
            const dialogTitle = document.getElementById('dialog-title');
            const titleText = dialogTitle ? dialogTitle.textContent : 'unknown';
            
            logger.warn(`Conversation dialog is open but should be closed (title: ${titleText})`);
            dialogElement.classList.remove('active');
            logger.info('Fixed: Closed conversation dialog');
        }
        
        // Fix 2: Reset send button state
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            if (!sendBtn.classList.contains('activate')) {
                const oldClasses = sendBtn.className;
                sendBtn.className = 'btn activate';
                logger.info('Fixed: Reset send button state', { 
                    oldClasses, 
                    newClasses: sendBtn.className 
                });
            }
        }
        
        // Fix 3: Check for orphaned event listeners and reattach
        reattachCriticalEventListeners();
        
        logger.info('Auto-fixes completed');
        return true;
    } catch (error) {
        logger.error('Error during auto-fixes', { error });
        return false;
    }
}

// Reattach critical event listeners
function reattachCriticalEventListeners() {
    logger.info('Reattaching critical event listeners...');
    
    // Use the global scope functions from main.js or app.js
    try {
        // These functions need to be exposed globally for this to work
        const handlers = {
            'new-conversation-btn': window.createNewConversation,
            'add-convo-btn': window.createNewConversation,
            'message-form': window.handleMessageSubmit // This will need to be exposed
        };
        
        Object.entries(handlers).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element && handler) {
                if (id === 'message-form') {
                    // For forms
                    element.removeEventListener('submit', handler);
                    element.addEventListener('submit', handler);
                    logger.info(`Reattached submit handler to ${id}`);
                } else {
                    // For buttons
                    element.removeEventListener('click', handler);
                    element.addEventListener('click', handler);
                    logger.info(`Reattached click handler to ${id}`);
                }
            } else if (element) {
                logger.warn(`Element ${id} found but handler is missing`);
            } else {
                logger.error(`Cannot reattach events - element ${id} not found`);
            }
        });
    } catch (error) {
        logger.error('Error reattaching event listeners', { error });
    }
}

// Export diagnostic functions for console use
window.runDiagnostics = runStartupDiagnostics;
window.attemptFixes = attemptAutoFixes;
window.checkDom = checkCriticalDomElements;
window.checkDatabase = checkDatabaseConnection;
window.checkEvents = checkEventListeners;
window.checkOverlays = checkOverlayElements;
