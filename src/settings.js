// Settings Module for API Keys and Application Preferences
import { invoke } from './tauri-bridge.js';
import logger from './logger.js';

// Settings class to manage application settings
class Settings {
    constructor() {
        this.apiKey = '';
        this.backgroundImage = null;
        this.initialized = false;
    }

    // Initialize settings
    async initialize() {
        if (this.initialized) return;
        
        try {
            logger.info('Initializing settings module');
            await this.loadApiKey();
            await this.loadBackgroundImage();
            this.initialized = true;
            logger.info('Settings module initialized successfully');
        } catch (error) {
            logger.error('Error initializing settings:', error);
        }
    }

    // Load API key from database
    async loadApiKey() {
        try {
            logger.info('Loading API key from settings');
            
            const result = await invoke('read_query', {
                query: `
                    SELECT value FROM Settings WHERE key = 'gemini_api_key'
                `
            });
            
            if (result.length > 0) {
                this.apiKey = result[0].value;
                logger.info('API key loaded successfully');
                return this.apiKey;
            } else {
                logger.info('No API key found in settings');
                return null;
            }
        } catch (error) {
            logger.error('Error loading API key:', error);
            return null;
        }
    }

    // Save API key to database
    async saveApiKey(newApiKey) {
        if (!newApiKey || newApiKey.trim() === '') {
            logger.warn('Attempted to save empty API key');
            throw new Error('API key cannot be empty');
        }
        
        try {
            logger.info('Saving new API key to settings');
            
            await invoke('write_query', {
                query: `
                    INSERT OR REPLACE INTO Settings (key, value)
                    VALUES ('gemini_api_key', ?)
                `,
                parameters: [newApiKey.trim()]
            });
            
            this.apiKey = newApiKey.trim();
            logger.info('API key saved successfully');
            return true;
        } catch (error) {
            logger.error('Error saving API key:', error);
            throw error;
        }
    }

    // Get API key
    getApiKey() {
        return this.apiKey;
    }

    // Check if API key is set
    hasApiKey() {
        return !!this.apiKey && this.apiKey.trim() !== '';
    }

    // Load background image from database
    async loadBackgroundImage() {
        try {
            logger.info('Loading background image from settings');
            
            const result = await invoke('read_query', {
                query: `
                    SELECT value FROM Settings WHERE key = 'background_image'
                `
            });
            
            if (result.length > 0) {
                this.backgroundImage = result[0].value;
                logger.info('Background image loaded successfully');
                return this.backgroundImage;
            } else {
                logger.info('No background image found in settings');
                return null;
            }
        } catch (error) {
            logger.error('Error loading background image:', error);
            return null;
        }
    }

    // Save background image to database
    async saveBackgroundImage(imageUrl) {
        if (!imageUrl) {
            logger.warn('Attempted to save empty background image');
            throw new Error('Background image cannot be empty');
        }
        
        try {
            logger.info('Saving new background image to settings');
            
            await invoke('write_query', {
                query: `
                    INSERT OR REPLACE INTO Settings (key, value)
                    VALUES ('background_image', ?)
                `,
                parameters: [imageUrl]
            });
            
            this.backgroundImage = imageUrl;
            logger.info('Background image saved successfully');
            return true;
        } catch (error) {
            logger.error('Error saving background image:', error);
            throw error;
        }
    }

    // Get background image
    getBackgroundImage() {
        return this.backgroundImage;
    }

    // For testing/validation
    async testApiKey() {
        if (!this.hasApiKey()) {
            throw new Error('No API key available to test');
        }
        
        try {
            // Simple test call to Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${this.apiKey}`);
            
            if (!response.ok) {
                throw new Error(`API key test failed: ${response.status} ${response.statusText}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error testing API key:', error);
            throw error;
        }
    }
}

// Create a singleton instance
const settings = new Settings();

// Export the settings instance
export default settings;
