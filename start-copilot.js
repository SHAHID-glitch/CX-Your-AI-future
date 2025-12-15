const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the HTML file
const htmlFile = path.join(__dirname, 'copilot-standalone.html');

// Check if file exists
if (!fs.existsSync(htmlFile)) {
    console.error('❌ Error: copilot-standalone.html not found!');
    process.exit(1);
}

console.log('🚀 Starting CopilotX...');
console.log('📂 Opening:', htmlFile);

// Command to open file in default browser (Windows)
const command = `start "" "${htmlFile}"`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error opening browser:', error.message);
        return;
    }
    
    console.log('✅ CopilotX opened successfully in your browser!');
    console.log('🌐 If it doesn\'t open automatically, navigate to:', htmlFile);
});