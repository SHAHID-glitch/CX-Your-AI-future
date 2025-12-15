// Quick test to verify endpoints are registered
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Checking if image endpoints are properly defined...\n');

const aiRouteFile = path.join(__dirname, 'routes/ai.js');
const aiRouteContent = fs.readFileSync(aiRouteFile, 'utf8');

// Check for the new endpoints
const hasMyImagesEndpoint = aiRouteContent.includes("router.get('/my-images'");
const hasDeleteImagesEndpoint = aiRouteContent.includes("router.delete('/images/:filename'");

console.log('✅ Check 1: GET /api/ai/my-images endpoint');
console.log(`   Found: ${hasMyImagesEndpoint ? '✓' : '✗'}\n`);

console.log('✅ Check 2: DELETE /api/ai/images/:filename endpoint');
console.log(`   Found: ${hasDeleteImagesEndpoint ? '✓' : '✗'}\n`);

// Check for module.exports
const hasModuleExports = aiRouteContent.includes('module.exports = router');
console.log('✅ Check 3: Routes exported properly');
console.log(`   Found: ${hasModuleExports ? '✓' : '✗'}\n`);

// Check server.js for mounting
const serverFile = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverFile, 'utf8');
const hasMountedRoutes = serverContent.includes("app.use('/api/ai', aiRoutes");

console.log('✅ Check 4: Routes mounted in server.js');
console.log(`   Found: ${hasMountedRoutes ? '✓' : '✗'}\n`);

// Check first.js for correct token usage
const firstFile = path.join(__dirname, 'first.js');
const firstContent = fs.readFileSync(firstFile, 'utf8');
const usesAuthToken = firstContent.includes("localStorage.getItem('authToken')");
const usesCorrectBearerFormat = firstContent.includes("Authorization: `Bearer ${authToken");

console.log('✅ Check 5: first.js uses correct token key');
console.log(`   Uses 'authToken': ${usesAuthToken ? '✓' : '✗'}`);
console.log(`   Uses Bearer format: ${usesCorrectBearerFormat ? '✓' : '✗'}\n`);

if (hasMyImagesEndpoint && hasDeleteImagesEndpoint && hasModuleExports && hasMountedRoutes && usesAuthToken) {
    console.log('✅ ALL CHECKS PASSED - Endpoints are properly configured!\n');
    console.log('📝 Next steps:');
    console.log('   1. Start the server: node server.js');
    console.log('   2. Open http://localhost:3000 in browser');
    console.log('   3. Sign in with your account');
    console.log('   4. Navigate to Library - images should load from backend');
    console.log('   5. Try deleting an image - should work now\n');
} else {
    console.log('❌ Some checks failed - review the configuration\n');
}
