// Test image search functionality
const { searchDuckDuckGoImages } = require('./utils/search');
const { needsImageSearch } = require('./utils/summarizer');

console.log('🧪 Testing Image Search Integration\n');

// Test 1: Image Search Detection
console.log('=== Test 1: Image Search Detection ===');
const testMessages = [
    'Show me pictures of cats',
    'What does Elon Musk look like',
    'Image of the Eiffel Tower',
    'Latest AI news',
    'How to learn programming'
];

testMessages.forEach(msg => {
    const needs = needsImageSearch(msg);
    console.log(`"${msg}"`);
    console.log(`  Image search needed: ${needs ? '✅ YES' : '❌ NO'}`);
    console.log('');
});

// Test 2: Actual Image Search
console.log('\n=== Test 2: Actual Image Search ===');
(async () => {
    try {
        console.log('Searching for images: "cute cats"...\n');
        const images = await searchDuckDuckGoImages('cute cats', 6);
        
        if (images && images.length > 0) {
            console.log(`✅ Found ${images.length} images:\n`);
            images.forEach((img, index) => {
                console.log(`${index + 1}. ${img.title}`);
                console.log(`   Thumbnail: ${img.thumbnail ? 'Available' : 'N/A'}`);
                console.log(`   Source: ${img.source}`);
                console.log(`   URL: ${img.url.substring(0, 60)}...\n`);
            });
            
            console.log('✅ Image search test passed!');
        } else {
            console.log('⚠️ No images found. This might be due to API limitations.');
            console.log('Note: DuckDuckGo image API may require additional setup.');
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
})();
