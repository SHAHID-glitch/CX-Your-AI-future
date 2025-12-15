const express = require('express');
const router = express.Router();
const { searchDuckDuckGo, searchDuckDuckGoImages, multiSourceSearch } = require('../utils/search');
const { 
    needsSearch,
    needsImageSearch,
    summarizeSearchResults, 
    generateContextFromResults,
    extractSearchQuery 
} = require('../utils/summarizer');

// In-memory cache for search results (5-minute TTL)
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

/**
 * Set cache with timestamp
 */
function setCache(key, value) {
    cache.set(key, { value, timestamp: Date.now() });
}

/**
 * Get cache if not expired
 */
function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    
    return entry.value;
}

/**
 * Clean up expired cache entries (run periodically)
 */
function cleanupCache() {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
            cache.delete(key);
        }
    }
}

// Run cache cleanup every 10 minutes
setInterval(cleanupCache, 1000 * 60 * 10);

/**
 * POST /api/search/query
 * Perform a web search
 */
router.post('/query', async (req, res) => {
    try {
        const { query, maxResults = 10 } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query is required and must be a string'
            });
        }

        console.log(`🔍 Search request: "${query}"`);

        // Check cache first
        const cacheKey = `${query}_${maxResults}`;
        const cached = getCache(cacheKey);
        
        if (cached) {
            console.log(`✅ Returning cached results for: "${query}"`);
            return res.json({
                success: true,
                query,
                results: cached,
                cached: true,
                count: cached.length
            });
        }

        // Perform search
        const results = await searchDuckDuckGo(query, maxResults);
        
        // Cache the results
        setCache(cacheKey, results);

        res.json({
            success: true,
            query,
            results,
            cached: false,
            count: results.length
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Search failed'
        });
    }
});

/**
 * POST /api/search/images
 * Search for images
 */
router.post('/images', async (req, res) => {
    try {
        const { query, maxResults = 6 } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Query is required and must be a string'
            });
        }

        console.log(`🖼️ Image search request: "${query}"`);

        // Check cache first
        const cacheKey = `images_${query}_${maxResults}`;
        const cached = getCache(cacheKey);
        
        if (cached) {
            console.log(`✅ Returning cached image results for: "${query}"`);
            return res.json({
                success: true,
                query,
                images: cached,
                cached: true,
                count: cached.length
            });
        }

        // Perform image search
        const images = await searchDuckDuckGoImages(query, maxResults);
        
        // Cache the results
        setCache(cacheKey, images);

        res.json({
            success: true,
            query,
            images,
            cached: false,
            count: images.length
        });

    } catch (error) {
        console.error('Image search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Image search failed'
        });
    }
});

/**
 * POST /api/search/smart
 * Smart search with automatic detection and summarization
 * This endpoint decides whether search is needed and returns formatted results
 */
router.post('/smart', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        console.log(`💭 Smart search analysis: "${message}"`);

        // Check if image search is needed
        const imageSearchNeeded = needsImageSearch(message);
        
        // Check if regular search is needed
        const searchNeeded = needsSearch(message) || imageSearchNeeded;
        
        if (!searchNeeded) {
            return res.json({
                success: true,
                searchNeeded: false,
                imageSearchNeeded: false,
                message: 'No search required - this can be answered locally'
            });
        }

        // Extract and optimize search query
        const searchQuery = extractSearchQuery(message);
        console.log(`🔍 Performing search for: "${searchQuery}"`);
        if (imageSearchNeeded) {
            console.log(`🖼️ Images will also be included`);
        }

        // Check cache
        const cacheKey = `smart_${searchQuery}_${imageSearchNeeded}`;
        const cached = getCache(cacheKey);
        
        if (cached) {
            console.log(`✅ Returning cached smart search for: "${searchQuery}"`);
            return res.json({
                success: true,
                searchNeeded: true,
                imageSearchNeeded,
                query: searchQuery,
                summary: cached.summary,
                aiContext: cached.aiContext,
                results: cached.results,
                images: cached.images || [],
                cached: true
            });
        }

        // Perform search
        const results = await searchDuckDuckGo(searchQuery, 10);
        
        // Perform image search if needed
        let images = [];
        if (imageSearchNeeded) {
            images = await searchDuckDuckGoImages(searchQuery, 6);
            console.log(`✅ Found ${images.length} images`);
        }
        
        // Generate summary and AI context
        const summary = summarizeSearchResults(searchQuery, results);
        const aiContext = generateContextFromResults(searchQuery, results);

        // Cache the processed results
        const processedResults = { summary, aiContext, results, images };
        setCache(cacheKey, processedResults);

        res.json({
            success: true,
            searchNeeded: true,
            imageSearchNeeded,
            query: searchQuery,
            summary,
            aiContext,
            results,
            images,
            cached: false
        });

    } catch (error) {
        console.error('Smart search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Smart search failed'
        });
    }
});

/**
 * GET /api/search/health
 * Health check for search service
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'search',
        status: 'operational',
        cacheSize: cache.size,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/search/check
 * Check if a message needs web search (utility endpoint)
 */
router.post('/check', (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        const searchNeeded = needsSearch(message);
        const searchQuery = searchNeeded ? extractSearchQuery(message) : null;

        res.json({
            success: true,
            searchNeeded,
            suggestedQuery: searchQuery
        });

    } catch (error) {
        console.error('Search check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
