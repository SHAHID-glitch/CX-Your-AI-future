/**
 * Lightweight search result summarizer and search detection logic
 * No external LLMs required - uses rule-based logic
 */

/**
 * Determine if a user message requires image search
 * @param {string} message - User's message
 * @returns {boolean} True if image search is needed
 */
function needsImageSearch(message) {
    const m = message.toLowerCase();
    
    // Direct image request keywords
    const imageKeywords = [
        'show me', 'show image', 'picture of', 'photo of', 'image of',
        'what does', 'what do', 'how does', 'looks like', 'look like',
        'show', 'display', 'see', 'view', 'visual', 'illustration',
        'diagram', 'chart', 'graph', 'screenshot', 'example of'
    ];
    
    // Visual subjects that benefit from images
    const visualSubjects = [
        'person', 'people', 'celebrity', 'actor', 'actress', 'artist',
        'animal', 'dog', 'cat', 'bird', 'car', 'building', 'place',
        'city', 'country', 'landscape', 'food', 'recipe', 'product',
        'fashion', 'style', 'design', 'architecture', 'artwork', 'painting'
    ];
    
    // Check for direct image requests
    if (imageKeywords.some(k => m.includes(k))) {
        return true;
    }
    
    // Check if asking about appearance/visuals
    if ((m.includes('what') || m.includes('how')) && 
        (m.includes('look') || m.includes('appear') || m.includes('seem'))) {
        return true;
    }
    
    // Check for visual subjects with contextual words
    if (visualSubjects.some(s => m.includes(s)) && 
        (m.includes('show') || m.includes('see') || m.includes('picture') || 
         m.includes('photo') || m.includes('image') || m.includes('what'))) {
        return true;
    }
    
    return false;
}

/**
 * Determine if a user message requires a web search
 * @param {string} message - User's message
 * @returns {boolean} True if search is needed
 */
function needsSearch(message) {
    const m = message.toLowerCase();
    
    // Keywords that strongly indicate a need for current/live information
    const timeBasedKeywords = [
        'latest', 'current', 'today', 'now', 'recent', 'trending', 
        'this week', 'this month', 'this year', 'yesterday', 
        'last week', 'last month', 'breaking', 'news', 'update',
        'right now', 'currently', 'just happened'
    ];
    
    // Price and market related queries
    const priceKeywords = [
        'price', 'cost', 'how much', 'stock price', 'crypto price',
        'market cap', 'value of', 'worth', 'exchange rate'
    ];
    
    // Factual queries that benefit from search
    const factualKeywords = [
        'who is', 'what is', 'where is', 'when did', 'when was',
        'how many', 'which', 'definition of', 'meaning of',
        'tell me about', 'information about', 'details about'
    ];
    
    // Weather and location based
    const locationKeywords = [
        'weather', 'temperature', 'forecast', 'climate'
    ];
    
    // Check for time-based keywords (highest priority)
    if (timeBasedKeywords.some(k => m.includes(k))) {
        return true;
    }
    
    // Check for price/market queries
    if (priceKeywords.some(k => m.includes(k))) {
        return true;
    }
    
    // Check for location-based queries
    if (locationKeywords.some(k => m.includes(k))) {
        return true;
    }
    
    // Check if message contains a year reference (indicates historical or current event)
    if (m.match(/\b(19|20)\d{2}\b/)) {
        return true;
    }
    
    // Check for factual queries (lower priority - only if significant)
    if (factualKeywords.some(k => m.includes(k)) && m.length > 15) {
        return true;
    }
    
    // Check for question marks with substantial queries
    if (m.includes('?') && m.length > 20) {
        // Likely a detailed question that could benefit from search
        return true;
    }
    
    return false;
}

/**
 * Summarize search results into a human-friendly format
 * @param {string} query - The original search query
 * @param {Array} results - Array of search results
 * @returns {string} Formatted summary
 */
function summarizeSearchResults(query, results) {
    if (!results || results.length === 0) {
        return `🔍 No search results found for "${query}". Please try rephrasing your query.`;
    }

    // Take top 5 results for summary
    const top = results.slice(0, 5);
    
    // Build formatted summary
    let summary = `🌐 **Search Results for "${query}"**\n\n`;
    
    top.forEach((result, index) => {
        const title = result.title || 'Untitled';
        const snippet = shorten(result.snippet, 120);
        const link = formatLink(result.link);
        
        summary += `**${index + 1}. ${title}**\n`;
        if (snippet) {
            summary += `   ${snippet}\n`;
        }
        if (link) {
            summary += `   🔗 ${link}\n`;
        }
        summary += '\n';
    });
    
    summary += `\n*Found ${results.length} results*`;
    
    return summary;
}

/**
 * Generate a concise AI-friendly context from search results
 * This can be fed to an AI model to generate a natural response
 * @param {string} query - The original search query
 * @param {Array} results - Array of search results
 * @returns {string} Context for AI
 */
function generateContextFromResults(query, results) {
    if (!results || results.length === 0) {
        return `No search results were found for the query: "${query}"`;
    }
    
    let context = `Based on web search results for "${query}":\n\n`;
    
    results.slice(0, 5).forEach((result, index) => {
        context += `Source ${index + 1} (${extractDomain(result.link)}):\n`;
        context += `Title: ${result.title}\n`;
        context += `Summary: ${result.snippet}\n\n`;
    });
    
    context += '\nPlease provide a helpful response based on these search results.';
    
    return context;
}

/**
 * Shorten text to specified length
 * @param {string} text - Text to shorten
 * @param {number} maxLength - Maximum length
 * @returns {string} Shortened text
 */
function shorten(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1).trim() + '…';
}

/**
 * Format link for display
 * @param {string} url - URL to format
 * @returns {string} Formatted URL
 */
function formatLink(url) {
    if (!url) return '';
    if (!url.startsWith('http')) return url;
    
    // Shorten very long URLs
    if (url.length > 80) {
        return url.slice(0, 77) + '...';
    }
    
    return url;
}

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch (e) {
        return 'unknown source';
    }
}

/**
 * Determine the best search query from user message
 * @param {string} message - User's message
 * @returns {string} Optimized search query
 */
function extractSearchQuery(message) {
    // Remove common question words that don't help search
    let query = message
        .toLowerCase()
        .replace(/^(can you |could you |please |tell me |what is |who is |where is |when is |how is )/gi, '')
        .replace(/\?$/g, '')
        .trim();
    
    // Capitalize important words for better search results
    query = query.split(' ')
        .map(word => word.length > 3 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
        .join(' ');
    
    return query || message;
}

module.exports = {
    needsSearch,
    needsImageSearch,
    summarizeSearchResults,
    generateContextFromResults,
    extractSearchQuery,
    shorten,
    formatLink,
    extractDomain
};
