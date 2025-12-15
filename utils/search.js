const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Search DuckDuckGo Lite for web results
 * @param {string} query - The search query
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} Array of search results with title, link, and snippet
 */
async function searchDuckDuckGo(query, maxResults = 10) {
    try {
        // Use the lite HTML interface which is stable and compact
        const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000 // 10 second timeout
        });

        const $ = cheerio.load(response.data);
        const results = [];

        // DuckDuckGo lite has links with class 'result-link' and snippets in nearby elements
        $('a.result-link').each((i, el) => {
            if (results.length >= maxResults) return false; // Stop when we have enough results

            const title = $(el).text().trim();
            let link = $(el).attr('href') || '';
            
            // Extract the actual URL from DuckDuckGo's redirect link
            if (link && link.includes('uddg=')) {
                try {
                    const urlParams = new URLSearchParams(link.split('?')[1]);
                    link = decodeURIComponent(urlParams.get('uddg') || link);
                } catch (e) {
                    // Keep original link if parsing fails
                }
            }

            // Get the snippet from the parent's next sibling or nearby text
            let snippet = '';
            const parent = $(el).parent();
            const nextElements = parent.nextAll().slice(0, 2);
            nextElements.each((j, nextEl) => {
                const text = $(nextEl).text().trim();
                if (text && !text.includes('http') && text.length > 20) {
                    snippet = text;
                    return false; // Break the loop
                }
            });

            if (title && link) {
                results.push({
                    title,
                    link,
                    snippet: snippet || 'No description available'
                });
            }
        });

        // Fallback: If no results with result-link class, try parsing <a> tags directly
        if (results.length === 0) {
            $('a').each((i, el) => {
                if (results.length >= maxResults) return false;

                const title = $(el).text().trim();
                const link = $(el).attr('href') || '';
                
                // Filter out navigation and internal DuckDuckGo links
                if (title && link && link.startsWith('http') && title.length > 5) {
                    const snippet = $(el).parent().text().trim() || 'No description available';
                    results.push({ title, link, snippet });
                }
            });
        }

        console.log(`✅ DuckDuckGo search completed: ${results.length} results for "${query}"`);
        return results.slice(0, maxResults);

    } catch (error) {
        console.error('❌ DuckDuckGo search error:', error.message);
        
        // Return a helpful error result
        return [{
            title: 'Search Error',
            link: '',
            snippet: `Unable to fetch search results: ${error.message}. Please try again.`
        }];
    }
}

/**
 * Search for images using Unsplash API (free, no auth required for basic usage)
 * @param {string} query - The search query
 * @param {number} maxResults - Maximum number of images to return (default: 6)
 * @returns {Promise<Array>} Array of image results with url, title, thumbnail, and source
 */
async function searchDuckDuckGoImages(query, maxResults = 6) {
    try {
        // Use Unsplash's public API (no API key needed for basic usage with attribution)
        const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${maxResults}`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const images = [];

        if (response.data && response.data.results) {
            response.data.results.forEach(img => {
                images.push({
                    url: img.urls?.regular || img.urls?.small || img.urls?.thumb,
                    thumbnail: img.urls?.thumb || img.urls?.small,
                    title: img.alt_description || img.description || query,
                    source: 'Unsplash',
                    photographer: img.user?.name || 'Unknown',
                    width: img.width || 0,
                    height: img.height || 0
                });
            });
        }

        console.log(`✅ Image search completed: ${images.length} images for "${query}"`);
        return images;

    } catch (error) {
        console.error('❌ Image search error:', error.message);
        
        // Fallback: Return placeholder image service URLs
        console.log('🔄 Using fallback placeholder images');
        const placeholders = [];
        for (let i = 0; i < Math.min(maxResults, 4); i++) {
            placeholders.push({
                url: `https://via.placeholder.com/400x300/2ea043/ffffff?text=${encodeURIComponent(query)}`,
                thumbnail: `https://via.placeholder.com/150x150/2ea043/ffffff?text=${encodeURIComponent(query)}`,
                title: `${query} (Placeholder ${i + 1})`,
                source: 'Placeholder',
                photographer: 'System',
                width: 400,
                height: 300
            });
        }
        return placeholders;
    }
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
        return 'unknown';
    }
}

/**
 * Search multiple sources for better results (future enhancement)
 * @param {string} query - The search query
 * @returns {Promise<Array>} Combined search results
 */
async function multiSourceSearch(query) {
    // Currently only DuckDuckGo, but can be extended to other sources
    const results = await searchDuckDuckGo(query);
    return results;
}

module.exports = {
    searchDuckDuckGo,
    searchDuckDuckGoImages,
    multiSourceSearch
};
