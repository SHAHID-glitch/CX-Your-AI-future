# 🚀 Quick Start - AI Search Feature

## Start Using Search in 3 Steps

### Step 1: Start the Server
```bash
npm start
```

### Step 2: Open CopilotX
Navigate to: `http://localhost:3000/copilot-standalone.html`

### Step 3: Try These Queries

**✅ Queries that trigger search:**
```
- Latest AI news
- Bitcoin price today
- Weather in London
- Who is Elon Musk
- What happened in 2024
- Current stock market trends
```

**❌ Queries that don't need search:**
```
- What is JSON?
- Explain recursion
- Write a poem
- How to learn programming
```

---

## What You'll See

When you ask a question that needs current information:

1. **AI Response** - The AI will answer using information from the web
2. **Search Results Box** - Below the AI response, you'll see:
   - 🌐 "Web Search Results" header
   - Links to sources with titles
   - Snippets from each source
   - Domain names
   - Click any link to visit the source

---

## Example Interaction

**You:** `What's the latest news on AI?`

**CopilotX:** *(AI generates response based on search results)*

**Search Results:**
```
🌐 Web Search Results

• Latest AI Developments - TechNews
  technews.com
  Recent advancements in artificial intelligence include...

• AI News Today - CNN Tech
  cnn.com
  Breaking developments in AI technology show...

• Top AI Trends 2024 - Forbes
  forbes.com
  This year has seen remarkable progress in...
```

---

## Testing Without UI

You can test the search API directly:

```bash
# Test search detection
curl -X POST http://localhost:3000/api/search/check \
  -H "Content-Type: application/json" \
  -d '{"message": "Latest Bitcoin price"}'

# Test actual search
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "bitcoin price", "maxResults": 5}'

# Test smart search (auto-detection + results)
curl -X POST http://localhost:3000/api/search/smart \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about recent AI developments"}'
```

---

## How to Disable Search

If you want to temporarily disable search:

**Option 1:** In `services/aiService.js`, comment out the search check:
```javascript
// if (needsSearch(message)) {
//     ... search code ...
// }
```

**Option 2:** In `utils/summarizer.js`, make `needsSearch` always return false:
```javascript
function needsSearch(message) {
    return false; // Disable all searches
}
```

---

## Troubleshooting

### Search not working?

1. **Check console** - Look for errors in terminal
2. **Check internet** - Verify you can access duckduckgo.com
3. **Clear cache** - Restart the server
4. **Check logs** - Look for "🔍 Web search detected" in console

### Search results not displaying?

1. **Check browser console** (F12)
2. **Verify JavaScript loaded** - Look for errors
3. **Check response** - Should include `metadata.searchResults`

### Search triggering too often/rarely?

Adjust keywords in `utils/summarizer.js`:
- Add more keywords to trigger more often
- Remove keywords to trigger less often

---

## Performance Tips

1. **Cache is your friend** - Repeated queries are cached for 5 minutes
2. **Specific queries work better** - "Bitcoin price today" vs "tell me prices"
3. **Network matters** - Slow internet = slower searches

---

## Next Steps

- Read [AI-SEARCH-INTEGRATION-GUIDE.md](./AI-SEARCH-INTEGRATION-GUIDE.md) for full documentation
- Customize search keywords in `utils/summarizer.js`
- Adjust caching in `routes/search.js`
- Add more search sources if needed

---

**Happy Searching! 🔍**
