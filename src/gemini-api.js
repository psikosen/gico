// Gemini API Integration Module
import settings from './settings.js'; 

class GeminiAPI {
    constructor() {
        this.model = 'gemini-1.5-flash'; // Default model
    }
    
    // Set model
    setModel(model) {
        this.model = model;
    }
    
    // Get API key from settings
    getApiKey() {
        return settings.getApiKey();
    }
    
    // Check if API key is available
    hasApiKey() {
        return settings.hasApiKey();
    }
    
    // Generate content (non-streaming)
    async generateContent(prompt, options = {}) {
        if (!this.hasApiKey()) {
            throw new Error('Gemini API key is missing. Please set it in Settings.');
        }
        
        try {
            const apiKey = this.getApiKey();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;
            
            const requestBody = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                ...options
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('No content in response');
            }
        } catch (error) {
            console.error('Error generating content:', error);
            throw error;
        }
    }
    
    // Stream generate content
    async streamGenerateContent(contents, callbacks = {}) {
        if (!this.hasApiKey()) {
            throw new Error('Gemini API key is missing. Please set it in Settings.');
        }
        
        const { onStart, onToken, onComplete, onError } = callbacks;
        
        try {
            const apiKey = this.getApiKey();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${apiKey}`;
            
            // Call onStart callback if provided
            if (onStart) onStart();
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contents })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
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
                                
                                // Call onToken callback if provided
                                if (onToken) onToken(textChunk, fullResponse);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
            
            // Call onComplete callback if provided
            if (onComplete) onComplete(fullResponse);
            
            return fullResponse;
        } catch (error) {
            console.error('Error streaming content:', error);
            
            // Call onError callback if provided
            if (onError) onError(error);
            
            throw error;
        }
    }
    
    // Chat with history
    async chat(messages, callbacks = {}) {
        if (!this.hasApiKey()) {
            throw new Error('Gemini API key is missing. Please set it in Settings.');
        }
        
        try {
            // Format messages for Gemini API
            const contents = messages.map(msg => ({
                role: msg.sender.toLowerCase() === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
            
            // Stream the response
            return await this.streamGenerateContent(contents, callbacks);
        } catch (error) {
            console.error('Error in chat:', error);
            throw error;
        }
    }
}

// Create a singleton instance
const geminiAPI = new GeminiAPI();

// Export the API instance
export default geminiAPI;
