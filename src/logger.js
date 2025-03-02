/**
 * Enhanced Logger Module - Provides comprehensive structured logging throughout the application
 * with detailed diagnostics for debugging UI and button issues
 */

// Log levels
const LogLevel = {
    TRACE: -1,   // For extremely detailed tracing
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

class Logger {
    constructor() {
        this.logLevel = LogLevel.TRACE; // Enhanced default log level for more details
        this.logs = []; // In-memory log storage
        this.maxLogs = 2000; // Increased maximum logs to keep in memory
        this.consoleOutput = true; // Whether to output to console
        this.fileOutput = false; // Whether to save logs to file (future feature)
        this.domEventsEnabled = true; // Track DOM events
        this.networkLoggingEnabled = true; // Track network requests
        this.uiInteractionLoggingEnabled = true; // Track UI interactions
        
        // Create a timestamp for the session
        this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
        
        this.info('Enhanced Logger initialized', { sessionId: this.sessionId });
    }
    
    // Set minimum log level
    setLogLevel(level) {
        this.logLevel = level;
        this.info(`Log level set to ${this._getLevelName(level)}`);
    }
    
    // Enable/disable console output
    setConsoleOutput(enabled) {
        this.consoleOutput = enabled;
    }
    
    // Log a trace message (extremely detailed)
    trace(message, data = {}) {
        this._log(LogLevel.TRACE, message, data);
    }
    
    // Log a debug message
    debug(message, data = {}) {
        this._log(LogLevel.DEBUG, message, data);
    }
    
    // Log an info message
    info(message, data = {}) {
        this._log(LogLevel.INFO, message, data);
    }
    
    // Log a warning message
    warn(message, data = {}) {
        this._log(LogLevel.WARN, message, data);
    }
    
    // Log an error message
    error(message, data = {}) {
        this._log(LogLevel.ERROR, message, data);
    }
    
    // Log a fatal error message
    fatal(message, data = {}) {
        this._log(LogLevel.FATAL, message, data);
    }
    
    // Log an error with the full stack trace
    logError(message, error, additionalData = {}) {
        const errorData = {
            ...additionalData,
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
        };
        
        this._log(LogLevel.ERROR, message, errorData);
    }
    
    // Internal logging method
    _log(level, message, data) {
        if (level < this.logLevel) return;
        
        const timestamp = new Date().toISOString();
        const levelName = this._getLevelName(level);
        
        const logEntry = {
            timestamp,
            level: levelName,
            message,
            data: { ...data }
        };
        
        // Add to in-memory logs
        this.logs.push(logEntry);
        
        // Trim logs if they exceed maximum
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        // Output to console if enabled
        if (this.consoleOutput) {
            this._consoleOutput(level, timestamp, message, data);
        }
        
        // Future: Output to file if enabled
    }
    
    // Convert log level to name
    _getLevelName(level) {
        switch (level) {
            case LogLevel.TRACE: return 'TRACE';
            case LogLevel.DEBUG: return 'DEBUG';
            case LogLevel.INFO: return 'INFO';
            case LogLevel.WARN: return 'WARN';
            case LogLevel.ERROR: return 'ERROR';
            case LogLevel.FATAL: return 'FATAL';
            default: return 'UNKNOWN';
        }
    }
    
    // Output to console with appropriate formatting
    _consoleOutput(level, timestamp, message, data) {
        let consoleMethod = console.log;
        let style = '';
        
        switch (level) {
            case LogLevel.TRACE:
                consoleMethod = console.debug;
                style = 'color: #AAAAAA'; // Light Gray
                break;
            case LogLevel.DEBUG:
                consoleMethod = console.debug;
                style = 'color: #7B7B7B'; // Gray
                break;
            case LogLevel.INFO:
                consoleMethod = console.info;
                style = 'color: #4A90E2'; // Blue
                break;
            case LogLevel.WARN:
                consoleMethod = console.warn;
                style = 'color: #FFB800'; // Yellow
                break;
            case LogLevel.ERROR:
                consoleMethod = console.error;
                style = 'color: #FF5959'; // Red
                break;
            case LogLevel.FATAL:
                consoleMethod = console.error;
                style = 'color: #FF0000; font-weight: bold'; // Bold Red
                break;
        }
        
        const levelName = this._getLevelName(level);
        const formattedData = Object.keys(data).length > 0 ? data : '';
        
        // Format: [LEVEL] [Time] Message
        consoleMethod(`%c[${levelName}] [${timestamp}] ${message}`, style, formattedData);
    }
    
    // Get all logs
    getLogs() {
        return [...this.logs];
    }
    
    // Get logs filtered by level
    getLogsByLevel(level) {
        const levelName = typeof level === 'string' ? level : this._getLevelName(level);
        return this.logs.filter(log => log.level === levelName);
    }
    
    // Clear logs
    clearLogs() {
        this.logs = [];
        this.info('Logs cleared');
    }
    
    // Export logs to JSON
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
    
    // Log DOM event
    logDomEvent(eventName, element, data = {}) {
        if (!this.domEventsEnabled) return;
        
        let elementInfo = 'unknown';
        if (element) {
            elementInfo = {
                id: element.id || 'no-id',
                className: element.className || 'no-class',
                tagName: element.tagName || 'unknown-tag',
                type: element.type || 'no-type'
            };
            
            // For buttons, log more detailed info
            if (element.tagName === 'BUTTON' || (element.tagName === 'INPUT' && element.type === 'button')) {
                elementInfo.text = element.textContent || element.value || 'no-text';
                elementInfo.disabled = element.disabled;
                elementInfo.visibility = window.getComputedStyle(element).visibility;
                elementInfo.display = window.getComputedStyle(element).display;
            }
        }
        
        this.debug(`DOM Event: ${eventName}`, { element: elementInfo, ...data });
    }
    
    // Log UI interaction (clicks, form submissions, etc.)
    logUIInteraction(action, element, data = {}) {
        if (!this.uiInteractionLoggingEnabled) return;
        
        let elementInfo = 'unknown';
        if (element) {
            elementInfo = {
                id: element.id || 'no-id',
                className: element.className || 'no-class',
                tagName: element.tagName || 'unknown-tag'
            };
        }
        
        this.info(`UI Interaction: ${action}`, { element: elementInfo, ...data });
    }
    
    // Log button state change
    logButtonState(buttonId, oldState, newState, data = {}) {
        if (!this.uiInteractionLoggingEnabled) return;
        
        const button = document.getElementById(buttonId);
        let buttonInfo = { id: buttonId };
        
        if (button) {
            buttonInfo = {
                ...buttonInfo,
                className: button.className || 'no-class',
                disabled: button.disabled,
                visibility: window.getComputedStyle(button).visibility,
                display: window.getComputedStyle(button).display
            };
        }
        
        this.debug(`Button state change: ${buttonId} ${oldState} → ${newState}`, { button: buttonInfo, ...data });
    }
    
    // Log network activity
    logNetworkRequest(url, method, status = null, data = {}) {
        if (!this.networkLoggingEnabled) return;
        
        this.debug(`Network ${method} request to ${url}${status ? ` - Status: ${status}` : ''}`, data);
    }
    
    // Analyze DOM for potential issues
    analyzeDOMIssues() {
        this.info('Running DOM analysis for potential issues');
        
        try {
            // Check for buttons that might have issues
            const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
            buttons.forEach(button => {
                const style = window.getComputedStyle(button);
                const issues = [];
                
                if (button.disabled) issues.push('disabled');
                if (style.display === 'none') issues.push('display:none');
                if (style.visibility === 'hidden') issues.push('visibility:hidden');
                if (parseFloat(style.opacity) === 0) issues.push('opacity:0');
                if (parseInt(style.zIndex) < 0) issues.push('negative z-index');
                if (parseInt(style.width) === 0 || parseInt(style.height) === 0) issues.push('zero size');
                
                // Check if button has valid event listeners
                if (button.onclick === null && !button.form) {
                    issues.push('no click handler');
                }
                
                if (issues.length > 0) {
                    this.warn(`Potential button issue: ${button.id || button.className || 'unnamed button'}`, {
                        element: button.outerHTML,
                        issues: issues
                    });
                }
            });
            
            // Check for overlapping elements that might catch clicks
            const overlayElements = document.querySelectorAll('.dialog, .modal, .overlay, [style*="position: absolute"], [style*="position: fixed"]');
            overlayElements.forEach(element => {
                const style = window.getComputedStyle(element);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    this.info(`Potential overlay element active: ${element.id || element.className}`, {
                        element: element.outerHTML,
                        zIndex: style.zIndex,
                        position: style.position
                    });
                }
            });
            
            this.info('DOM analysis completed');
        } catch (error) {
            this.error('Error analyzing DOM', { error });
        }
    }
    
    // Create an error object with context data
    createError(message, originalError = null, contextData = {}) {
        const error = new Error(message);
        error.originalError = originalError;
        error.contextData = contextData;
        return error;
    }
}

// Create singleton instance
const logger = new Logger();

// Export the logger instance
export default logger;
