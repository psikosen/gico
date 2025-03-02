// Enhanced Button Animation Functionality with Robust Logging
import logger from './logger.js';

document.addEventListener('DOMContentLoaded', () => {
    logger.info('Initializing fancy send button');
    
    // Find the send button
    const button = document.querySelector(".btn");
    if (!button) {
        logger.error('Send button not found in DOM', {
            selectors_tried: ['.btn'],
            possible_buttons: Array.from(document.querySelectorAll('button')).map(b => ({
                id: b.id,
                class: b.className,
                text: b.textContent.trim()
            }))
        });
        return;
    }
    
    logger.info('Send button found', { id: button.id, class: button.className });

    // Initial state
    button.classList = "btn activate";
    logger.debug('Button initial state set to "activate"');

    // Enhanced function to handle button state changes with logging
    window.handleButtonState = (state) => {
        logger.info(`Changing button state to: ${state}`, { 
            button_id: button.id,
            previous_state: button.className.replace('btn', '').trim(),
            new_state: state
        });
        
        try {
            switch (state) {
                case 'waiting':
                    // Log the current classes before changing
                    logger.debug(`Button classes before waiting: ${button.className}`);
                    if (!button.classList.contains("activate")) {
                        // Fix state if not in activate state
                        logger.warn('Button not in activate state before setting waiting', { 
                            current_classes: button.className 
                        });
                        button.classList = "btn activate";
                    }
                    button.classList.replace("activate", "waiting");
                    logger.debug(`Button classes after waiting: ${button.className}`);
                    break;
                    
                case 'activated':
                    // Log the current classes before changing
                    logger.debug(`Button classes before activated: ${button.className}`);
                    if (!button.classList.contains("waiting")) {
                        // Fix state if not in waiting state
                        logger.warn('Button not in waiting state before setting activated', { 
                            current_classes: button.className 
                        });
                        button.classList = "btn waiting";
                    }
                    button.classList.replace("waiting", "activated");
                    logger.debug(`Button classes after activated: ${button.className}`);
                    
                    // Schedule return to activate state
                    setTimeout(() => {
                        logger.debug('Button timeout triggered, returning to activate state');
                        button.classList.replace("activated", "activate");
                    }, 2500);
                    break;
                    
                case 'activate':
                    // Reset to known good state
                    logger.debug(`Button classes before reset: ${button.className}`);
                    button.classList = "btn activate";
                    logger.debug(`Button classes after reset: ${button.className}`);
                    break;
                    
                default:
                    logger.error(`Unknown button state requested: ${state}`);
                    button.classList = "btn activate"; // Ensure reset to a known state
            }
        } catch (error) {
            logger.error('Error changing button state', { error, state, button_classes: button.className });
            // Attempt recovery
            button.classList = "btn activate";
        }
    };

    // Enhanced click handler (for testing and debugging)
    const onClick = e => {
        logger.info('Button clicked directly (test mode)');
        
        const isStart = button.classList.contains("activate");
        if (isStart) {
            logger.debug('Starting test animation sequence');
            button.classList.replace("activate", "waiting");
            
            setTimeout(() => {
                logger.debug('Test animation: waiting → activated');
                button.classList.replace("waiting", "activated");
                
                setTimeout(() => {
                    logger.debug('Test animation: activated → activate');
                    button.classList.replace("activated", "activate");
                }, 2500);
            }, 4000);
        } else {
            logger.debug('Resetting button to activate state');
            button.classList = "btn activate";
        }
    };

    // Detect if event listeners are properly attached to the form
    setTimeout(() => {
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            // Check if the form has submit listeners
            const listeners = window.getEventListeners?.(messageForm)?.submit || [];
            if (listeners.length === 0) {
                logger.warn('No submit event listeners detected on message form', {
                    form_id: messageForm.id,
                    btn_id: button.id
                });
            } else {
                logger.info('Message form has submit listeners', {
                    count: listeners.length
                });
            }
        } else {
            logger.error('Message form not found in DOM');
        }
    }, 1000);
    
    // For debugging, we'll enable direct click handling if debug flag is set
    if (window.GICO_DEBUG_MODE) {
        logger.info('Debug mode enabled: attaching direct click handler to button');
        button.addEventListener("click", onClick);
    }
    
    // Expose diagnostic function for button
    window.diagnoseSendButton = () => {
        logger.info('Running send button diagnostics');
        return {
            button_found: !!button,
            button_id: button?.id,
            button_classes: button?.className,
            button_disabled: button?.disabled,
            button_visible: button ? (window.getComputedStyle(button).display !== 'none') : false,
            button_clickable: button ? (window.getComputedStyle(button).pointerEvents !== 'none') : false,
            button_has_transitions: button ? (window.getComputedStyle(button).transition !== 'none') : false,
            form_found: !!document.getElementById('message-form'),
            message_input_found: !!document.getElementById('message-input'),
        };
    };
});

// Set debug flag - this can be toggled in the console to enable direct button testing
window.GICO_DEBUG_MODE = false;
