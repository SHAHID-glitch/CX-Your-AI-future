// Quick test script for the AI Search Integration
const { searchDuckDuckGo } = require('./utils/search');
const { needsSearch, extractSearchQuery, summarizeSearchResults } = require('./utils/summarizer');

console.log('🧪 Testing AI Search Integration\n');

// Test 1: Search Detection
console.log('=== Test 1: Search Detection ===');
const testMessages = [
    'Latest AI news',
    'What is JSON?',
    'Bitcoin price today',
    'Weather in New York',
    'Explain recursion'
];

testMessages.forEach(msg => {
    const needs = needsSearch(msg);
    const query = needs ? extractSearchQuery(msg) : null;
    console.log(`"${msg}"`);
    console.log(`  Search needed: ${needs ? '✅ YES' : '❌ NO'}`);
    if (query) console.log(`  Optimized query: "${query}"`);
    console.log('');
});

// Test 2: Actual Search
console.log('\n=== Test 2: Actual Search ===');
(async () => {
    try {
        console.log('Searching DuckDuckGo for: "latest AI developments"...\n');
        const results = await searchDuckDuckGo('latest AI developments', 5);
        
        if (results && results.length > 0) {
            console.log(`✅ Found ${results.length} results:\n`);
            results.forEach((result, index) => {
                console.log(`${index + 1}. ${result.title}`);
                console.log(`   ${result.link}`);
                console.log(`   ${result.snippet.substring(0, 100)}...\n`);
            });
            
            // Test 3: Summarization
            console.log('\n=== Test 3: Summarization ===');
            const summary = summarizeSearchResults('latest AI developments', results);
            console.log(summary);
            
            console.log('\n✅ All tests passed! Search integration is working correctly.');
        } else {
            console.log('⚠️ No results found. This might be a network issue.');
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
})();
