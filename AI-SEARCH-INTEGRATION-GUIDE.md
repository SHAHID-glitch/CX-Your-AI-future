# 🔍 Free AI Search Integration - CopilotX

## Overview

CopilotX now includes **100% free web search capabilities** powered by DuckDuckGo scraping. No API keys required! The system automatically detects when a user query needs current information from the web and integrates search results seamlessly into AI responses.

---

## Features

✅ **Automatic Search Detection** - Intelligently determines when web search is needed  
✅ **DuckDuckGo Integration** - Free, no API keys required  
✅ **Smart Summarization** - Presents search results in a user-friendly format  
✅ **AI Integration** - Search context is automatically fed to AI for informed responses  
✅ **Caching System** - 5-minute cache to reduce redundant searches  
✅ **Beautiful UI** - Search results display with links, snippets, and source domains  

---

## How It Works

### 1. Automatic Detection

The system automatically detects queries that need current information:

**Triggers search for:**
- Time-based keywords: "latest", "current", "today", "now", "trending"
- Price queries: "price of", "cost", "stock price"
- News queries: "news", "update", "breaking"
- Factual questions: "who is", "what is", "where is"
- Year references: mentions of specific years (2023, 2024, etc.)

**Example queries that trigger search:**
- "Latest AI news"
- "Bitcoin price today"
- "Who is the current president"
- "Weather in New York"
- "What happened in 2024"

### 2. Search Process

1. User sends a message
2. AI service checks if search is needed
3. If yes, searches DuckDuckGo for top 5-10 results
4. Results are formatted and added to AI context
5. AI generates response using both its knowledge AND search results
6. User sees AI response + formatted search results with clickable links

### 3. Caching

- Search results are cached for 5 minutes
- Reduces redundant searches for same queries
- Improves response time
- Cache automatically cleans up expired entries

---

## API Endpoints

### POST `/api/search/query`

Direct search endpoint.

**Request:**
```json
{
  "query": "latest AI developments",
  "maxResults": 10
}
```

**Response:**
```json
{
  "success": true,
  "query": "latest AI developments",
  "results": [
    {
      "title": "Title of article",
      "link": "https://example.com/article",
      "snippet": "Article description..."
    }
  ],
  "cached": false,
  "count": 10
}
```

### POST `/api/search/smart`

Smart search with automatic detection and summarization.

**Request:**
```json
{
  "message": "What's the latest news on AI?"
}
```

**Response:**
```json
{
  "success": true,
  "searchNeeded": true,
  "query": "latest news AI",
  "summary": "Formatted summary...",
  "aiContext": "Context for AI...",
  "results": [...],
  "cached": false
}
```

### POST `/api/search/check`

Check if a message needs search (utility endpoint).

**Request:**
```json
{
  "message": "What's the weather today?"
}
```

**Response:**
```json
{
  "success": true,
  "searchNeeded": true,
  "suggestedQuery": "weather today"
}
```

### GET `/api/search/health`

Health check for search service.

**Response:**
```json
{
  "success": true,
  "service": "search",
  "status": "operational",
  "cacheSize": 5,
  "timestamp": "2024-12-14T..."
}
```

---

## Files Added/Modified

### New Files

1. **`utils/search.js`** - DuckDuckGo scraper
   - Scrapes DuckDuckGo Lite for search results
   - Extracts titles, links, and snippets
   - Error handling and fallbacks

2. **`utils/summarizer.js`** - Search detection and summarization
   - `needsSearch()` - Detects if search is needed
   - `extractSearchQuery()` - Optimizes query for search
   - `summarizeSearchResults()` - Formats results for users
   - `generateContextFromResults()` - Creates AI-friendly context

3. **`routes/search.js`** - Search API endpoints
   - Multiple endpoints for different use cases
   - Built-in caching system
   - Error handling

### Modified Files

1. **`package.json`** - Added `cheerio` dependency for HTML parsing

2. **`server.js`** - Added search routes
   ```javascript
   const searchRoutes = require('./routes/search');
   app.use('/api/search', searchRoutes);
   ```

3. **`services/aiService.js`** - Integrated search into AI generation
   - Automatically checks if search is needed
   - Fetches search results
   - Adds results to AI context
   - Returns search results in metadata

4. **`first.js`** (Frontend) - Display search results
   - Updated `addMessage()` to accept search results
   - Created `createSearchResultsHTML()` for formatting
   - Updated all response handlers to display search results

---

## Usage Examples

### Example 1: Latest News
```
User: "What's the latest AI news?"
```
System detects this needs search → searches → AI responds with information from search results + displays clickable links to sources

### Example 2: Current Prices
```
User: "Bitcoin price today"
```
System searches for current Bitcoin price → displays multiple sources with prices

### Example 3: General Knowledge (No Search)
```
User: "What is JSON?"
```
System determines this is general knowledge → AI responds directly without search

### Example 4: Weather
```
User: "Weather in Paris"
```
System searches for current weather → displays multiple weather sources

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

This will install the new `cheerio` dependency automatically.

### 2. Restart Server

```bash
npm start
# or
npm run dev
```

### 3. Test the Feature

Try these test queries:
- "Latest news on AI"
- "Bitcoin price today"
- "Weather in New York"
- "Who won the 2024 election"

---

## Configuration

### Adjust Search Behavior

Edit `utils/summarizer.js` to customize:

```javascript
// Add more keywords that trigger search
const timeBasedKeywords = [
    'latest', 'current', 'today', 'now', 'recent', 'trending',
    // Add your keywords here
];
```

### Adjust Cache Duration

Edit `routes/search.js`:

```javascript
const CACHE_TTL_MS = 1000 * 60 * 5; // Change 5 to desired minutes
```

### Change Number of Results

Edit `utils/search.js`:

```javascript
async function searchDuckDuckGo(query, maxResults = 10) {
    // Change default maxResults
}
```

---

## Advantages

1. **100% Free** - No API keys, no costs
2. **No Rate Limits** - DuckDuckGo doesn't have strict rate limits
3. **Privacy Friendly** - DuckDuckGo doesn't track users
4. **Automatic** - Works seamlessly without user intervention
5. **Smart Detection** - Only searches when needed
6. **Cached** - Fast responses for repeated queries
7. **Beautiful UI** - Results are well-formatted with clickable links

---

## Limitations

1. **Scraping Dependent** - If DuckDuckGo changes their HTML structure, scraper may need updates
2. **No Deep Content** - Only gets title, link, and snippet (not full article content)
3. **Rate Limiting Risk** - Excessive searches might get blocked (mitigated by caching)
4. **No Authentication** - DuckDuckGo doesn't require auth, but also means no guaranteed uptime

---

## Troubleshooting

### Search Not Working

**Check console logs:**
```
🔍 Web search detected as needed for query
🌐 Searching for: "your query"
✅ Search completed: X results found
```

If you see errors:
- Check internet connection
- Verify DuckDuckGo is accessible
- Check console for specific error messages

### No Search Results Displayed

1. Check browser console for JavaScript errors
2. Verify `first.js` is loaded correctly
3. Check that response includes `metadata.searchResults`

### Search Triggering When It Shouldn't

Adjust detection keywords in `utils/summarizer.js`:
- Remove overly broad keywords
- Make conditions more specific

---

## Future Enhancements

Possible improvements:
- [ ] Add more search sources (Bing, Google Custom Search)
- [ ] Deep content extraction (full article text)
- [ ] Search result ranking/scoring
- [ ] User preference for enabling/disabling search
- [ ] Search history tracking
- [ ] Image search results
- [ ] News-specific search mode
- [ ] Shopping/product search

---

## Testing

### Test Search Detection

```bash
curl -X POST http://localhost:3000/api/search/check \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the latest AI news?"}'
```

### Test Direct Search

```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "artificial intelligence news", "maxResults": 5}'
```

### Test Smart Search

```bash
curl -X POST http://localhost:3000/api/search/smart \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about recent AI developments"}'
```

---

## Support

If you encounter issues:
1. Check server logs
2. Check browser console
3. Verify all files are in place
4. Ensure dependencies are installed
5. Test with simple queries first

---

## Credits

- **DuckDuckGo** - Search provider
- **Cheerio** - HTML parsing
- **CopilotX Team** - Integration and implementation

---

**Enjoy your new free AI search capabilities! 🎉**
