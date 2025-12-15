const { AzureOpenAI } = require('openai');
const Groq = require('groq-sdk');
const { HfInference } = require('@huggingface/inference');
const { searchDuckDuckGo, searchDuckDuckGoImages } = require('../utils/search');
const { needsSearch, needsImageSearch, generateContextFromResults, extractSearchQuery } = require('../utils/summarizer');
require('dotenv').config();

// Import memoryService lazily to avoid circular dependency
let memoryService;

class AIService {
    constructor() {
        // Initialize Azure OpenAI client
        this.azureClient = null;
        if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
            try {
                this.azureClient = new AzureOpenAI({
                    apiKey: process.env.AZURE_OPENAI_API_KEY.replace(/^["']|["']$/g, ''),
                    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
                });
            } catch (error) {
                console.warn('Azure OpenAI initialization failed:', error.message);
            }
        }

        // Initialize Groq client
        this.groqClient = null;
        if (process.env.GROQ_API_KEY) {
            try {
                this.groqClient = new Groq({
                    apiKey: process.env.GROQ_API_KEY
                });
            } catch (error) {
                console.warn('Groq initialization failed:', error.message);
            }
        }

        // Initialize Hugging Face client
        this.hfClient = null;
        if (process.env.HUGGINGFACE_API_KEY) {
            try {
                this.hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);
            } catch (error) {
                console.warn('Hugging Face initialization failed:', error.message);
            }
        }

        // Determine which provider to use (USE GROQ ONLY)
        this.provider = this.groqClient ? 'groq' : 'mock';
        console.log(`🤖 AI Service initialized with provider: ${this.provider.toUpperCase()}`);
        
        this.responseStyles = {
            concise: {
                systemPrompt: 'You are a helpful AI assistant. Provide brief, concise answers.',
                maxTokens: 150,
                temperature: 0.5
            },
            balanced: {
                systemPrompt: 'You are a helpful AI assistant. Provide balanced, informative answers.',
                maxTokens: 500,
                temperature: 0.7
            },
            detailed: {
                systemPrompt: 'You are a helpful AI assistant. Provide comprehensive, detailed answers with examples.',
                maxTokens: 1000,
                temperature: 0.7
            },
            creative: {
                systemPrompt: 'You are a creative AI assistant. Think outside the box and provide imaginative, innovative responses.',
                maxTokens: 800,
                temperature: 0.9
            }
        };
    }

    async generateResponse(message, conversationHistory = [], responseType = 'balanced', userId = null, conversationId = null) {
        try {
            const style = this.responseStyles[responseType] || this.responseStyles.balanced;
            
            // Check if image search is needed
            const imageSearchNeeded = needsImageSearch(message);
            
            // Check if web search is needed for this query
            let searchContext = '';
            let searchResults = null;
            let imageResults = null;
            
            if (needsSearch(message) || imageSearchNeeded) {
                console.log('🔍 Web search detected as needed for query');
                try {
                    const searchQuery = extractSearchQuery(message);
                    console.log(`🌐 Searching for: "${searchQuery}"`);
                    
                    // Perform text search
                    searchResults = await searchDuckDuckGo(searchQuery, 5);
                    
                    if (searchResults && searchResults.length > 0) {
                        searchContext = generateContextFromResults(searchQuery, searchResults);
                        console.log(`✅ Search completed: ${searchResults.length} results found`);
                    }
                    
                    // Perform image search if needed
                    if (imageSearchNeeded) {
                        console.log(`🖼️ Fetching images for: "${searchQuery}"`);
                        imageResults = await searchDuckDuckGoImages(searchQuery, 6);
                        console.log(`✅ Found ${imageResults.length} images`);
                    }
                } catch (searchError) {
                    console.warn('Search failed, continuing without search context:', searchError.message);
                }
            }
            
            // Get personalized context from user memory if userId is provided
            let personalizedContext = '';
            if (userId) {
                try {
                    // Lazy load memoryService to avoid circular dependency
                    if (!memoryService) {
                        memoryService = require('./memoryService');
                    }
                    const memoryContext = await memoryService.getPersonalizedContext(userId, conversationId);
                    personalizedContext = memoryContext.contextText;
                } catch (error) {
                    console.warn('Failed to get personalized context:', error.message);
                }
            }
            
            // Build enhanced system prompt with memory context and search results
            let enhancedSystemPrompt = style.systemPrompt;
            
            if (searchContext) {
                enhancedSystemPrompt += `\n\n**Web Search Results:**\n${searchContext}`;
                enhancedSystemPrompt += '\n\nPlease incorporate the latest information from these search results into your response. Cite the sources when appropriate.';
            }
            
            if (personalizedContext) {
                enhancedSystemPrompt += `\n\n**User Context:** ${personalizedContext}`;
                enhancedSystemPrompt += '\n\nUse this context to provide more personalized and relevant responses. Reference past topics when appropriate and anticipate user needs based on their interests.';
            }
            
            // Build messages array
            const messages = [
                { role: 'system', content: enhancedSystemPrompt }
            ];

            // Add conversation history (last 10 messages for context)
            const recentHistory = conversationHistory.slice(-10);
            recentHistory.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });

            // Add current message
            messages.push({
                role: 'user',
                content: message
            });

            const startTime = Date.now();

            // Use Groq only for chat
            let response;
            if (this.groqClient) {
                response = await this.generateWithGroq(messages, style, startTime);
            } else {
                response = this.generateMockResponse(message, responseType);
            }
            
            // Add search results to metadata if available
            if (searchResults && searchResults.length > 0) {
                response.metadata.searchResults = searchResults;
                response.metadata.searchEnabled = true;
            }
            
            // Add image results to metadata if available
            if (imageResults && imageResults.length > 0) {
                response.metadata.imageResults = imageResults;
                response.metadata.imageSearchEnabled = true;
            }
            
            return response;

        } catch (error) {
            console.error('AI Service Error:', error);
            
            // Fallback to mock response if Groq fails
            console.log('🔄 Groq failed, falling back to mock response...');
            return this.generateMockResponse(message, responseType);
        }
    }

    async generateWithAzure(messages, style, startTime) {
        const completion = await this.azureClient.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4-deployment',
            messages: messages,
            max_tokens: style.maxTokens,
            temperature: style.temperature
        });

        const processingTime = Date.now() - startTime;

        return {
            content: completion.choices[0].message.content,
            metadata: {
                provider: 'azure',
                model: completion.model,
                temperature: style.temperature,
                tokens: completion.usage.total_tokens,
                processingTime: processingTime
            }
        };
    }

    async generateWithGroq(messages, style, startTime) {
        const completion = await this.groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            max_tokens: style.maxTokens,
            temperature: style.temperature
        });

        const processingTime = Date.now() - startTime;

        return {
            content: completion.choices[0].message.content,
            metadata: {
                provider: 'groq',
                model: completion.model,
                temperature: style.temperature,
                tokens: completion.usage.total_tokens,
                processingTime: processingTime
            }
        };
    }

    async generateWithHuggingFace(messages, style, startTime) {
        // Convert messages to a single prompt for Hugging Face
        let prompt = '';
        messages.forEach(msg => {
            if (msg.role === 'system') {
                prompt += `System: ${msg.content}\n\n`;
            } else if (msg.role === 'user') {
                prompt += `User: ${msg.content}\n`;
            } else if (msg.role === 'assistant') {
                prompt += `Assistant: ${msg.content}\n`;
            }
        });
        prompt += 'Assistant: ';

        const response = await this.hfClient.textGeneration({
            model: 'mistralai/Mistral-7B-Instruct-v0.2',
            inputs: prompt,
            parameters: {
                max_new_tokens: style.maxTokens,
                temperature: style.temperature,
                top_p: 0.95,
                return_full_text: false
            }
        });

        const processingTime = Date.now() - startTime;

        return {
            content: response.generated_text.trim(),
            metadata: {
                provider: 'huggingface',
                model: 'mistralai/Mistral-7B-Instruct-v0.2',
                temperature: style.temperature,
                tokens: Math.ceil(response.generated_text.length / 4), // Rough estimate
                processingTime: processingTime
            }
        };
    }

    generateMockResponse(message, responseType = 'balanced') {
        const mockResponses = {
            concise: `Brief answer: I understand your query about "${message.slice(0, 50)}". Here's a concise response.`,
            
            balanced: `Thank you for your question about "${message.slice(0, 30)}..."\n\nThat's an interesting topic. Let me provide a balanced perspective:\n\n1. **Context**: This relates to several key concepts\n2. **Analysis**: There are multiple factors to consider\n3. **Recommendation**: Based on this information, I suggest...\n\nWould you like me to elaborate on any specific point?`,
            
            detailed: `Excellent question about "${message.slice(0, 30)}..."!\n\n**Comprehensive Analysis:**\n\nLet me break this down in detail:\n\n**Background:**\nFirst, it's important to understand the broader context. This topic encompasses several key areas that we should explore.\n\n**Key Points:**\n1. **Primary Consideration**: The main aspect to focus on is...\n2. **Secondary Factors**: Additionally, we need to consider...\n3. **Implications**: This has several important implications...\n\n**Examples:**\n- Example 1: Consider how this applies in...\n- Example 2: Another instance would be...\n\n**Conclusion:**\nTo summarize, the best approach would be to...\n\nIs there a specific aspect you'd like me to explore further?`,
            
            creative: `🎨 What a fascinating prompt about "${message.slice(0, 30)}..."!\n\nLet me think outside the box here... Imagine if we approached this from a completely different angle:\n\n**Creative Perspective:**\nWhat if instead of the conventional approach, we considered this like [creative analogy]? This opens up exciting possibilities!\n\n**Innovative Ideas:**\n- 💡 Idea 1: We could reimagine this as...\n- 🚀 Idea 2: Another creative approach might be...\n- ✨ Idea 3: What about combining elements of...\n\n**Out-of-the-Box Solution:**\nHere's a fresh take: [creative solution]\n\nThe beauty of this creative approach is that it breaks traditional boundaries and explores new territories!\n\nShall we explore any of these creative directions further? 🌟`
        };

        return {
            content: mockResponses[responseType] || mockResponses.balanced,
            metadata: {
                provider: 'mock',
                model: 'mock-model',
                temperature: this.responseStyles[responseType].temperature,
                tokens: 0,
                processingTime: 500 + Math.random() * 500
            }
        };
    }

    async streamResponse(message, conversationHistory = [], responseType = 'balanced') {
        // Implement streaming response for real-time updates
        // This would use OpenAI's streaming API
        // For now, return the regular response
        return this.generateResponse(message, conversationHistory, responseType);
    }

    async generateConversationTitle(firstMessage, aiResponse = null) {
        try {
            // First check if it's random keyboard input
            if (this.isRandomKeyboardInput(firstMessage)) {
                return 'Keyboard Test';
            }
            
            // Clean the message
            const cleanMessage = firstMessage.replace(/[^\w\s]/g, ' ').trim();
            if (cleanMessage.length < 3) {
                return 'Quick Chat';
            }
            
            // Extract 6-8 meaningful words directly from the conversation
            return this.extractTitleFromContent(cleanMessage);

        } catch (error) {
            console.warn('Title generation failed, using fallback:', error.message);
            return this.extractTitleFromContent(firstMessage);
        }
    }

    extractTitleFromContent(message) {
        // Remove common stop words
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'can', 'you', 'i', 'me', 'my', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'that', 'this', 'these', 'those'
        ]);
        
        // Convert to lowercase and split into words
        const words = message.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()))
            .slice(0, 8); // Get up to 8 words
        
        if (words.length === 0) {
            // If no meaningful words, use first few words as-is
            return message.split(/\s+/).slice(0, 6).join(' ').slice(0, 60);
        }
        
        // Capitalize first letter of each word
        const title = words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .slice(0, 60);
        
        return title;
    }





    async generateTitle(firstMessage) {
        // Legacy method - redirect to new method for backward compatibility
        return await this.generateConversationTitle(firstMessage);
    }

    async moderateContent(content) {
        // Basic content moderation
        const inappropriatePatterns = [
            /\b(hate|violence|explicit)\b/i
            // Add more patterns as needed
        ];

        for (const pattern of inappropriatePatterns) {
            if (pattern.test(content)) {
                return {
                    flagged: true,
                    reason: 'Content may violate usage policies'
                };
            }
        }

        return { flagged: false };
    }

    isRandomKeyboardInput(text) {
        // Check for common keyboard patterns
        const keyboardPatterns = [
            /^[asdfghjkl;']+$/i,           // Home row
            /^[qwertyuiop\[\]\\]+$/i,      // Top row
            /^[zxcvbnm,\.\/]+$/i,          // Bottom row
            /^[1234567890\-=]+$/i,         // Number row
            /^(asdf|qwer|zxcv|hjkl|uiop)+$/i, // Repeated patterns
            /^(.)\1{4,}$/,                 // Repeated single character (5+ times)
            /^[a-z]{8,}$/i,                // Long sequence of only letters (likely random)
        ];
        
        const trimmed = text.trim();
        
        // Check if it matches any keyboard pattern
        for (const pattern of keyboardPatterns) {
            if (pattern.test(trimmed)) {
                return true;
            }
        }
        
        // Check if text has very low vowel ratio (gibberish detection)
        const vowels = (trimmed.match(/[aeiou]/gi) || []).length;
        const consonants = (trimmed.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
        
        if (consonants > 5 && vowels / consonants < 0.2) {
            return true; // Likely gibberish
        }
        
        return false;
    }

    async generateTitleForConversation(messages) {
        if (!messages || messages.length === 0) {
            return 'New Chat';
        }

        // Get the first user message and the first assistant response
        const firstUserMessage = messages.find(m => m.role === 'user');
        const firstAssistantMessage = messages.find(m => m.role === 'assistant');

        if (firstUserMessage) {
            return await this.generateConversationTitle(firstUserMessage.content, firstAssistantMessage ? firstAssistantMessage.content : null);
        }

        return 'New Chat';
    }
}

module.exports = new AIService();
