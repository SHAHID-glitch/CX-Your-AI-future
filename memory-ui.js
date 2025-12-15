/**
 * Memory and Insights UI Module
 * Displays user insights, predictions, and personalized suggestions
 */

// API Base URL
const API_BASE_URL = 'http://localhost:3000';

// Get auth token
function getAuthToken() {
    return localStorage.getItem('authToken') || '';
}

// Get auth headers
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
        'user-id': localStorage.getItem('userId') || ''
    };
}

/**
 * Load and display user insights
 */
async function loadUserInsights() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/memory/insights`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to load insights');
        }
        
        const data = await response.json();
        if (data.success) {
            displayInsights(data.insights);
        }
    } catch (error) {
        console.error('Error loading insights:', error);
    }
}

/**
 * Display insights in the UI
 */
function displayInsights(insights) {
    const container = document.getElementById('insightsContainer');
    if (!container) return;
    
    let html = '<div class="insights-panel">';
    
    // Top Topics
    if (insights.topTopics && insights.topTopics.length > 0) {
        html += '<div class="insight-section">';
        html += '<h3><i class="fas fa-chart-line"></i> Your Top Topics</h3>';
        html += '<div class="topic-cloud">';
        insights.topTopics.forEach(topic => {
            const size = Math.min(12 + topic.frequency * 2, 24);
            html += `<span class="topic-tag" style="font-size: ${size}px">${topic.topic}</span>`;
        });
        html += '</div></div>';
    }
    
    // Recent Activity
    if (insights.recentActivity) {
        html += '<div class="insight-section">';
        html += '<h3><i class="fas fa-activity"></i> Recent Activity</h3>';
        html += `<div class="stat-grid">`;
        html += `<div class="stat-item">
            <span class="stat-value">${insights.recentActivity.totalConversations}</span>
            <span class="stat-label">Conversations</span>
        </div>`;
        html += `<div class="stat-item">
            <span class="stat-value">${insights.recentActivity.totalMessages}</span>
            <span class="stat-label">Messages</span>
        </div>`;
        html += `<div class="stat-item">
            <span class="stat-value">${Math.round(insights.recentActivity.averageEngagement)}%</span>
            <span class="stat-label">Engagement</span>
        </div>`;
        html += `</div></div>`;
    }
    
    // Predictions
    if (insights.predictions && insights.predictions.likelyQuestions && insights.predictions.likelyQuestions.length > 0) {
        html += '<div class="insight-section">';
        html += '<h3><i class="fas fa-lightbulb"></i> You Might Be Interested In</h3>';
        html += '<div class="predictions-list">';
        insights.predictions.likelyQuestions.slice(0, 5).forEach(pred => {
            html += `<div class="prediction-item" onclick="askPredictedQuestion('${pred.question.replace(/'/g, "\\'")}')"}>
                <span class="prediction-text">${pred.question}</span>
                <span class="prediction-confidence">${Math.round(pred.probability * 100)}%</span>
            </div>`;
        });
        html += '</div></div>';
    }
    
    // Active Topics
    if (insights.activeTopics && insights.activeTopics.length > 0) {
        html += '<div class="insight-section">';
        html += '<h3><i class="fas fa-project-diagram"></i> Active Projects</h3>';
        insights.activeTopics.forEach(topic => {
            html += `<div class="active-topic-card">
                <h4>${topic.topic}</h4>
                <p>${topic.description || ''}</p>
                <span class="topic-date">Started: ${new Date(topic.startedAt).toLocaleDateString()}</span>
            </div>`;
        });
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Ask a predicted question
 */
function askPredictedQuestion(question) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = question;
        input.focus();
        // Trigger send if sendMessage function exists
        if (typeof sendMessage === 'function') {
            sendMessage();
        }
    }
}

/**
 * Load predictions
 */
async function loadPredictions() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/memory/predictions`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to load predictions');
        }
        
        const data = await response.json();
        if (data.success && data.predictions) {
            displayPredictions(data.predictions);
        }
    } catch (error) {
        console.error('Error loading predictions:', error);
    }
}

/**
 * Display predictions
 */
function displayPredictions(predictions) {
    const container = document.getElementById('predictionsContainer');
    if (!container) return;
    
    let html = '<div class="predictions-panel">';
    
    // Suggested Topics
    if (predictions.suggestedTopics && predictions.suggestedTopics.length > 0) {
        html += '<h4>Topics You Might Like</h4>';
        predictions.suggestedTopics.forEach(topic => {
            html += `<div class="suggested-topic">
                <span class="topic-name">${topic.topic}</span>
                <span class="topic-reason">${topic.reason}</span>
            </div>`;
        });
    }
    
    // Likely Questions
    if (predictions.likelyQuestions && predictions.likelyQuestions.length > 0) {
        html += '<h4>Questions You Might Ask</h4>';
        predictions.likelyQuestions.forEach(q => {
            html += `<div class="predicted-question" onclick="askPredictedQuestion('${q.question.replace(/'/g, "\\'")}')"}>
                <i class="fas fa-question-circle"></i> ${q.question}
            </div>`;
        });
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Record feedback for learning
 */
async function recordFeedback(messageId, feedbackType, reason = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/api/memory/feedback`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                messageId,
                feedbackType,
                reason
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to record feedback');
        }
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Feedback recorded');
            // Show subtle confirmation
            showFeedbackConfirmation();
        }
    } catch (error) {
        console.error('Error recording feedback:', error);
    }
}

/**
 * Show feedback confirmation
 */
function showFeedbackConfirmation() {
    const notification = document.createElement('div');
    notification.className = 'feedback-confirmation';
    notification.textContent = 'Thanks for your feedback! I\'m learning...';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/**
 * Load learning progress
 */
async function loadLearningProgress() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/memory/learning-progress`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to load learning progress');
        }
        
        const data = await response.json();
        if (data.success && data.progress) {
            displayLearningProgress(data.progress);
        }
    } catch (error) {
        console.error('Error loading learning progress:', error);
    }
}

/**
 * Display learning progress
 */
function displayLearningProgress(progress) {
    const container = document.getElementById('learningProgressContainer');
    if (!container) return;
    
    const score = progress.learningScore || 0;
    
    let html = `
        <div class="learning-progress-panel">
            <h3>AI Learning Progress</h3>
            <div class="progress-circle">
                <svg width="120" height="120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e0e0e0" stroke-width="8"/>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#667eea" stroke-width="8"
                            stroke-dasharray="${score * 3.39} 339" 
                            stroke-linecap="round" 
                            transform="rotate(-90 60 60)"/>
                </svg>
                <div class="progress-text">${score}%</div>
            </div>
            <div class="progress-stats">
                <div class="progress-stat">
                    <span class="stat-value">${progress.patternsIdentified}</span>
                    <span class="stat-label">Patterns Found</span>
                </div>
                <div class="progress-stat">
                    <span class="stat-value">${progress.conversationsAnalyzed}</span>
                    <span class="stat-label">Chats Analyzed</span>
                </div>
                <div class="progress-stat">
                    <span class="stat-value">${progress.feedbackReceived}</span>
                    <span class="stat-label">Feedback Received</span>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Initialize memory UI
 */
function initMemoryUI() {
    // Load insights on page load if user is authenticated
    const authToken = getAuthToken();
    if (authToken) {
        loadUserInsights();
        loadLearningProgress();
    }
}

// Export functions for global use
window.loadUserInsights = loadUserInsights;
window.loadPredictions = loadPredictions;
window.recordFeedback = recordFeedback;
window.loadLearningProgress = loadLearningProgress;
window.askPredictedQuestion = askPredictedQuestion;
window.initMemoryUI = initMemoryUI;
