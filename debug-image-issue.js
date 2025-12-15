// Debug script to test image saving and loading
// Run this in the browser console to debug the image issue

async function debugImageIssue() {
    console.log('🔍 Debug: Checking image conversation issue...');
    
    // 1. Check if we have a current conversation
    console.log('Current conversation ID:', currentConversationId);
    
    // 2. Check if backend is connected
    console.log('Backend connected:', isBackendConnected);
    
    // 3. Check generated images in localStorage
    const images = localStorage.getItem('generatedImages');
    console.log('Images in localStorage:', images ? JSON.parse(images) : 'None');
    
    // 4. If we have a conversation, debug it
    if (currentConversationId) {
        try {
            const response = await fetch(`http://localhost:3000/api/debug/conversation/${currentConversationId}`);
            const data = await response.json();
            console.log('🔍 Conversation debug data:', data);
            
            if (data.success) {
                console.log('📋 Messages in conversation:');
                data.messages.forEach((msg, i) => {
                    console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
                    console.log(`     Attachments:`, msg.attachments);
                    console.log(`     Has attachments:`, msg.hasAttachments);
                });
            }
        } catch (error) {
            console.error('Failed to debug conversation:', error);
        }
    }
    
    // 5. Check current messages in UI
    const messagesInUI = document.querySelectorAll('.message');
    console.log('📱 Messages in UI:', messagesInUI.length);
    messagesInUI.forEach((msg, i) => {
        const role = msg.classList.contains('user') ? 'user' : 'assistant';
        const content = msg.querySelector('.message-bubble').textContent.substring(0, 50);
        const hasImage = msg.querySelector('img') !== null;
        console.log(`  ${i + 1}. [${role}] ${content}... (has image: ${hasImage})`);
    });
}

// Call the debug function
debugImageIssue();