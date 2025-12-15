@echo off
echo 🚀 Starting CopilotX...
echo 📂 Opening copilot-standalone.html...

REM Check if the file exists
if not exist "copilot-standalone.html" (
    echo ❌ Error: copilot-standalone.html not found!
    pause
    exit /b 1
)

REM Open the HTML file in default browser
start "" "copilot-standalone.html"

echo ✅ CopilotX opened successfully in your browser!
echo 🌐 If it doesn't open automatically, double-click on copilot-standalone.html
pause