console.log('📝 Copilot script starting...');

        // ====================================
        // 📌 CONFIGURATION
        // ====================================
        const CONFIG = {
            DEFAULT_PORT: 3000,
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000,
            DEBOUNCE_DELAY: 300,
            THROTTLE_DELAY: 500,
            MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
            SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            SUPPORTED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg']
        };

        // API Configuration - Only declare if not already defined by memory-ui.js
        if (typeof API_BASE_URL === 'undefined') {
            const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            var API_BASE_URL = isLocalhost
                ? `http://${window.location.hostname}:${window.location.port || CONFIG.DEFAULT_PORT}`
                : window.location.origin;
        }
        
        // Check if running from file:// protocol and warn user
        if (window.location.protocol === 'file:') {
            console.warn('⚠️  WARNING: Running from file:// protocol');
            console.warn('⚠️  Server features (AI, Podcast, etc.) will not work!');
            console.warn(`💡 Solution: Start the server and access via http://localhost:${CONFIG.DEFAULT_PORT}`);
        }
        
        console.log('🌐 API Base URL:', API_BASE_URL);
        
        // ====================================
        // 📌 STATE MANAGEMENT
        // ====================================
        const AppState = {
            messages: [],
            conversation: [], // Frontend conversation memory
            charCount: 0,
            currentQuickResponse: 'balanced',
            currentSlide: 0,
            totalSlides: 0,
            navigationHistory: [],
            currentSection: 'discover',
            isVoiceActive: false,
            uploadedFiles: [],
            generatedImages: [],
            ocrResults: [],
            currentOcrContext: '',
            currentConversationId: null,
            isBackendConnected: false,
            currentAbortController: null,
            isGenerating: false,
            
            // State getters with default values
            getUserId: () => window.currentUser?.id || window.currentUser?.userId || localStorage.getItem('userId'),
            getAuthToken: () => localStorage.getItem('authToken'),
            isAuthenticated: () => !!AppState.getUserId(),
            
            // State reset
            resetConversation: () => {
                AppState.messages = [];
                AppState.conversation = [];
                AppState.charCount = 0;
                AppState.uploadedFiles = [];
            }
        };
        
        // Legacy variable references (for backward compatibility)
        let messages = AppState.messages;
        let conversation = AppState.conversation;
        let charCount = AppState.charCount;
        let currentQuickResponse = AppState.currentQuickResponse;
        let currentSlide = AppState.currentSlide;
        let totalSlides = AppState.totalSlides;
        let navigationHistory = AppState.navigationHistory;
        let currentSection = AppState.currentSection;
        let isVoiceActive = AppState.isVoiceActive;
        let uploadedFiles = AppState.uploadedFiles;
        let generatedImages = AppState.generatedImages;
        let ocrResults = AppState.ocrResults;
        let currentOcrContext = AppState.currentOcrContext;

        // ====================================
        // 📌 UTILITY FUNCTIONS
        // ====================================
        
        /**
         * Retry async operation with exponential backoff
         * @param {Function} fn - Async function to retry
         * @param {number} retries - Number of retry attempts
         * @param {number} delay - Initial delay in ms
         * @returns {Promise<any>}
         */
        const retryAsync = async (fn, retries = CONFIG.RETRY_ATTEMPTS, delay = CONFIG.RETRY_DELAY) => {
            try {
                return await fn();
            } catch (error) {
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, delay));
                return retryAsync(fn, retries - 1, delay * 2);
            }
        };
        
        /**
         * Debounce function to limit execution rate
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in ms
         * @returns {Function}
         */
        const debounce = (func, wait = CONFIG.DEBOUNCE_DELAY) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };
        
        /**
         * Throttle function to limit execution frequency
         * @param {Function} func - Function to throttle
         * @param {number} limit - Time limit in ms
         * @returns {Function}
         */
        const throttle = (func, limit = CONFIG.THROTTLE_DELAY) => {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        };
        
        /**
         * Safe JSON parse with fallback
         * @param {string} data - JSON string to parse
         * @param {any} fallback - Fallback value if parse fails
         * @returns {any}
         */
        const safeJsonParse = (data, fallback = null) => {
            try {
                if (data === null || data === undefined) {
                    return fallback;
                }
                return JSON.parse(data);
            } catch {
                return fallback;
            }
        };
        
        // ====================================
        // 📌 LIBRARY MANAGEMENT
        // ====================================
        
        /**
         * Load library data from backend API (per-user images)
         * @returns {Promise<void>}
         */
        async function loadLibraryFromStorage() {
            try {
                const userId = AppState.getUserId();
                
                // If user is not authenticated, use localStorage fallback
                if (!userId) {
                    console.log('ℹ️  No authenticated user - using localStorage fallback');
                    const savedImages = safeJsonParse(localStorage.getItem('generatedImages'), []);
                    
                    AppState.generatedImages = Array.isArray(savedImages) ? savedImages.map(img => ({
                        ...img,
                        url: img.url?.startsWith('http') ? img.url : `http://localhost:${CONFIG.DEFAULT_PORT}${img.url}`
                    })) : [];
                    
                    console.log(`📚 Loaded ${AppState.generatedImages.length} images from localStorage (not authenticated)`);
                    return;
                }
                
                // Load user's images from backend API with retry logic
                const authToken = AppState.getAuthToken();
                console.log('📸 Loading user images from backend for user:', userId);
                console.log('🔑 Auth token present:', !!authToken);
                
                const fetchImages = async () => {
                    const response = await fetch(`${API_BASE_URL}/api/ai/my-images`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken || ''}`
                        },
                        signal: AbortSignal.timeout(10000) // 10 second timeout
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    return response.json();
                };
                
                try {
                    const data = await retryAsync(fetchImages, 2, 1000);
                    
                    if (data.success && Array.isArray(data.images)) {
                        // Convert backend image list to format compatible with frontend
                        AppState.generatedImages = data.images.map(img => ({
                            url: img.url?.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`,
                            filename: img.filename || 'unknown',
                            timestamp: img.timestamp || Date.now(),
                            prompt: img.prompt || img.filename || 'Generated Image'
                        }));
                        
                        console.log(`✅ Loaded ${AppState.generatedImages.length} images from backend`);
                    } else {
                        console.log('ℹ️  No images found for this user');
                        AppState.generatedImages = [];
                    }
                } catch (fetchError) {
                    console.warn(`⚠️  Failed to load images from backend:`, fetchError.message);
                    // Fallback to localStorage if backend fails
                    const savedImages = safeJsonParse(localStorage.getItem('generatedImages'), []);
                    AppState.generatedImages = Array.isArray(savedImages) ? savedImages : [];
                    console.log(`📚 Fallback: Loaded ${AppState.generatedImages.length} images from localStorage`);
                }
            } catch (error) {
                console.error('❌ Error loading library from backend:', error.message || error);
                // Fallback to localStorage
                try {
                    const savedImages = safeJsonParse(localStorage.getItem('generatedImages'), []);
                    AppState.generatedImages = Array.isArray(savedImages) ? savedImages : [];
                    console.log(`📚 Fallback: Loaded ${AppState.generatedImages.length} images from localStorage after error`);
                } catch (fallbackError) {
                    console.error('❌ Even fallback failed:', fallbackError.message || fallbackError);
                    AppState.generatedImages = [];
                }
            } finally {
                // Sync legacy variable
                generatedImages = AppState.generatedImages;
            }
        }

        /**
         * Display library content with generated images
         * @returns {void}
         */
        function displayLibrary() {
            const messagesContainer = document.getElementById('messagesContainer');
            if (!messagesContainer) {
                console.warn('⚠️  Messages container not found');
                return;
            }
            
            messagesContainer.innerHTML = '';
            
            // Create library header
            const libraryHeader = document.createElement('div');
            libraryHeader.className = 'library-header';
            libraryHeader.innerHTML = `
                <h2>Your Library</h2>
                <p>Generated images and saved content</p>
            `;
            messagesContainer.appendChild(libraryHeader);
            
            // Display generated images
            const images = AppState.generatedImages || [];
            if (images.length > 0) {
                const imagesSection = document.createElement('div');
                imagesSection.className = 'library-section';
                imagesSection.innerHTML = `
                    <h3><i class="fas fa-images"></i> Generated Images (${generatedImages.length})</h3>
                    <div class="library-grid" id="libraryImagesGrid"></div>
                `;
                messagesContainer.appendChild(imagesSection);
                
                const grid = imagesSection.querySelector('.library-grid');
                generatedImages.forEach((imageData, index) => {
                    const imageCard = createLibraryImageCard(imageData, index);
                    grid.appendChild(imageCard);
                });
            } else {
                const emptySection = document.createElement('div');
                emptySection.className = 'library-empty';
                emptySection.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-images"></i>
                        <h3>No Images Yet</h3>
                        <p>Generate some images in your chats to see them here!</p>
                        <button onclick="navigateTo('imagine')" class="btn-primary">
                            <i class="fas fa-magic"></i> Generate Images
                        </button>
                    </div>
                `;
                messagesContainer.appendChild(emptySection);
            }
        }

        // Create library image card
        function createLibraryImageCard(imageData, index) {
            const card = document.createElement('div');
            card.className = 'library-image-card';
            
            card.innerHTML = `
                <div class="image-container">
                    <img src="${imageData.url}" alt="${imageData.prompt || 'Generated Image'}" loading="lazy">
                    <div class="image-overlay">
                        <button onclick="viewLibraryImage(${index})" title="View Full Size">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button onclick="copyImageUrl('${imageData.url}', event)" title="Copy URL">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button onclick="deleteLibraryImage(${index})" title="Delete" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="image-info">
                    <p class="image-prompt">${imageData.prompt || 'No prompt available'}</p>
                    <small class="image-date">${imageData.timestamp ? new Date(imageData.timestamp).toLocaleDateString() : 'Unknown date'}</small>
                </div>
            `;
            
            return card;
        }

        // Library image actions
        function viewLibraryImage(index) {
            if (generatedImages[index]) {
                const imageData = generatedImages[index];
                // Create modal to view full size image
                const modal = document.createElement('div');
                modal.className = 'image-modal';
                modal.innerHTML = `
                    <div class="image-modal-content">
                        <div class="image-modal-header">
                            <h3>${imageData.prompt || 'Generated Image'}</h3>
                            <button onclick="this.closest('.image-modal').remove()" class="modal-close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="image-modal-body">
                            <img src="${imageData.url}" alt="${imageData.prompt || 'Generated Image'}">
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Close on backdrop click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.remove();
                    }
                });
            }
        }

        function copyImageUrl(url) {
            navigator.clipboard.writeText(url).then(() => {
                showNotification('Image URL copied to clipboard!', 'success');
            }).catch(() => {
                showNotification('Failed to copy URL', 'error');
            });
        }

        function deleteLibraryImage(index) {
            if (confirm('Delete this image from your library?')) {
                const imageData = generatedImages[index];
                const filename = imageData.filename;
                const authToken = localStorage.getItem('authToken');
                
                // Delete from backend
                fetch(`${API_BASE_URL}/api/ai/images/${encodeURIComponent(filename)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken || ''}`
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to delete image: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Remove from local array
                        generatedImages.splice(index, 1);
                        displayLibrary(); // Refresh display
                        showNotification('Image deleted from library', 'success');
                        console.log('✅ Image deleted:', filename);
                    } else {
                        showNotification('Failed to delete image', 'error');
                    }
                })
                .catch(error => {
                    console.error('❌ Error deleting image:', error);
                    showNotification('Error deleting image: ' + error.message, 'error');
                });
            }
        }
        
        // Backend Integration State
        let currentConversationId = null;
        let isBackendConnected = false;
        let currentAbortController = null; // For cancelling ongoing requests
        let isGenerating = false; // Track if AI is generating response

        // 🎛 Voice Assistant Control
        let voiceStyle = "juniper"; // Options: "juniper" (softer, smarter) or "sol" (deeper, calm)
        let isVoiceAssistantActive = false;
        let recognition = null;
        let isRecording = false;
        let mediaRecorder = null;
        let audioChunks = [];

        // 🔑 Hugging Face API Key - Load from environment variable
        // IMPORTANT: Never hardcode API keys! Set HUGGINGFACE_API_KEY in your .env file
        const HF_API_KEY = null; // This should be fetched from backend, not exposed in frontend

        // Initialize
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('🚀 Page loaded, initializing...');
            
            try {
                // Hide loading screen after 1.5 seconds
                setTimeout(() => {
                    const loadingScreen = document.getElementById('loadingScreen');
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                        console.log('✅ Loading screen hidden');
                    }
                }, 1500);

                loadTheme();
                setupSidebar();
                setupActionButtons();
                setupCarousel();
                setupFileUpload();
                setupKeyboardShortcuts();
                setupNetworkListeners(); // Monitor network status for speech recognition
                await loadLibraryFromStorage(); // Wait for library to load from backend
                
                // Setup auth modal
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.addEventListener('click', function(e) {
                        if (e.target === modal) {
                            closeAuthModal();
                        }
                    });
                }
                
                // Setup settings modal
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    settingsModal.addEventListener('click', function(e) {
                        if (e.target === settingsModal) {
                            closeSettingsModal();
                        }
                    });
                }

                // Setup edit profile modal
                const editProfileModal = document.getElementById('editProfileModal');
                if (editProfileModal) {
                    editProfileModal.addEventListener('click', function(e) {
                        if (e.target === editProfileModal) {
                            closeEditProfileModal();
                        }
                    });
                }

                // Setup memory manager modal
                const memoryManagerModal = document.getElementById('memoryManagerModal');
                if (memoryManagerModal) {
                    memoryManagerModal.addEventListener('click', function(e) {
                        if (e.target === memoryManagerModal) {
                            closeMemoryManager();
                        }
                    });
                }
                
                // Setup mobile sidebar enhancements
                setupMobileSidebarEnhancements();
                
                // Initialize settings
                initializeSettings();
                
                // Initialize avatar on page load
                initializeAvatar();
                
                // Check backend connection (non-blocking)
                setTimeout(() => {
                    checkBackendConnection();
                }, 100);
                
                // Check authentication status (non-blocking)
                setTimeout(() => {
                    checkAuth();
                }, 200);
                
                console.log('✅ Initialization complete');
            } catch (error) {
                console.error('❌ Initialization error:', error);
                // Still hide loading screen even if there's an error
                setTimeout(() => {
                    const loadingScreen = document.getElementById('loadingScreen');
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                    }
                }, 1000);
            }
            
            // Don't add initial message - let carousel show first
        });

        // Check Backend Connection
        async function checkBackendConnection() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/health`);
                const data = await response.json();
                if (data.status === 'ok') {
                    isBackendConnected = true;
                    console.log('✅ Backend connected:', data);
                    
                    // Show status indicator
                    const statusEl = document.getElementById('backendStatus');
                    if (statusEl) {
                        statusEl.style.display = 'flex';
                    }
                }
            } catch (error) {
                isBackendConnected = false;
                console.log('⚠ Backend not connected, using mock responses');
                
                // Hide status indicator
                const statusEl = document.getElementById('backendStatus');
                if (statusEl) {
                    statusEl.style.display = 'none';
                }
            }
        }

        // Keyboard Shortcuts
        function setupKeyboardShortcuts() {
            document.addEventListener('keydown', function(e) {
                // Ctrl+B to toggle sidebar
                if (e.ctrlKey && e.key === 'b') {
                    e.preventDefault();
                    toggleSidebar();
                }
                // Ctrl+Shift+O to create new chat
                if (e.ctrlKey && e.shiftKey && e.key === 'O') {
                    e.preventDefault();
                    newChat();
                }
            });
        }

        // New Chat Function
        async function newChat() {
            // Close mobile sidebar when creating new chat (if on mobile)
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
            
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.innerHTML = '';
            messages = [];
            ocrResults = [];
            currentOcrContext = '';
            
            // Reset conversation ID for new chat - conversation will be created when first message is sent
            currentConversationId = null;
            
            const cs = document.getElementById('carouselSection');
            if (cs) { 
                cs.style.display = ''; 
            }
            
            const ag = document.getElementById('actionGrid');
            if (ag) { 
                ag.style.opacity = '1'; 
                ag.style.pointerEvents = 'auto'; 
            }
            
            document.getElementById('greeting').textContent = 'Hi there. What should we dive into today?';
            document.getElementById('chatInput').value = '';
            
            // Remove active state from all conversations
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            
            console.log('✅ New chat started - conversation will be created when first message is sent');
        }
        window.newChat = newChat;

        // Conversation Menu Functions
        let activeConversationMenu = null;

        function toggleConversationMenu(event, conversationId) {
            event.stopPropagation();
            
            // Close any existing menu
            if (activeConversationMenu) {
                activeConversationMenu.remove();
                if (activeConversationMenu.dataset.id === conversationId.toString()) {
                    activeConversationMenu = null;
                    return;
                }
            }

            // Create menu
            const menu = document.createElement('div');
            menu.className = 'conversation-menu';
            menu.dataset.id = conversationId;
            
            // Position menu - use data-conversation-id instead of data-id
            const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            
            // Check if conversation is pinned
            const isPinned = conversationItem && conversationItem.classList.contains('pinned');
            const pinText = isPinned ? 'Unpin chat' : 'Pin chat';
            
            menu.innerHTML = `
                <button class="conversation-menu-item" onclick="shareConversation('${conversationId}')">
                    <i class="fas fa-share-nodes"></i>
                    <span>Share chat</span>
                </button>
                <button class="conversation-menu-item" onclick="togglePinConversation('${conversationId}')">
                    <i class="fas fa-thumbtack"></i>
                    <span id="pinBtnText_${conversationId}">${pinText}</span>
                </button>
                <button class="conversation-menu-item" onclick="renameConversation('${conversationId}')">
                    <i class="fas fa-pen"></i>
                    <span>Rename</span>
                </button>
                <button class="conversation-menu-item danger" onclick="deleteConversation('${conversationId}')">
                    <i class="fas fa-trash"></i>
                    <span>Delete chat</span>
                </button>
            `;
            if (conversationItem) {
                // Append menu to body for fixed positioning (avoids overflow clipping)
                document.body.appendChild(menu);
                
                // Position menu relative to the conversation item
                const rect = conversationItem.getBoundingClientRect();
                menu.style.top = `${rect.bottom + 4}px`;
                menu.style.left = `${rect.right - menu.offsetWidth}px`;
                
                // Ensure menu doesn't go off-screen
                const menuRect = menu.getBoundingClientRect();
                if (menuRect.bottom > window.innerHeight) {
                    menu.style.top = `${rect.top - menuRect.height - 4}px`;
                }
                if (menuRect.left < 0) {
                    menu.style.left = `${rect.left}px`;
                }
                
                activeConversationMenu = menu;

                // Close menu when clicking outside
                setTimeout(() => {
                    document.addEventListener('click', closeConversationMenuOnClickOutside);
                }, 0);
            }
        }

        function closeConversationMenuOnClickOutside(event) {
            if (activeConversationMenu && !activeConversationMenu.contains(event.target)) {
                activeConversationMenu.remove();
                activeConversationMenu = null;
                document.removeEventListener('click', closeConversationMenuOnClickOutside);
            }
        }

        async function shareConversation(conversationId) {
            if (activeConversationMenu) {
                activeConversationMenu.remove();
                activeConversationMenu = null;
            }

            const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            if (!conversationItem) return;
            const conversationTitle = conversationItem.querySelector('span').textContent;

            // Create shareable link (you can customize this URL)
            const shareUrl = `${window.location.origin}/share/${conversationId}`;
            const shareText = `Check out this conversation: ${conversationTitle}`;

            // Try native Web Share API first (works on mobile)
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: conversationTitle,
                        text: shareText,
                        url: shareUrl
                    });
                    console.log('✅ Shared successfully');
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Share failed:', error);
                        copyShareLink(shareUrl);
                    }
                }
            } else {
                // Fallback: Copy to clipboard
                copyShareLink(shareUrl);
            }
        }

        function copyShareLink(url) {
            navigator.clipboard.writeText(url).then(() => {
                // Show notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: var(--success);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: var(--shadow-lg);
                    z-index: 10000;
                    animation: slideInRight 0.3s ease;
                `;
                notification.innerHTML = `
                    <i class="fas fa-check-circle"></i> Link copied to clipboard!
                `;
                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.style.animation = 'slideOutRight 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }).catch(err => {
                alert('Share link: ' + url);
            });
        }

        async function renameConversation(conversationId) {
            if (activeConversationMenu) {
                activeConversationMenu.remove();
                activeConversationMenu = null;
            }

            const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            if (!conversationItem) return;
            const titleSpan = conversationItem.querySelector('span');
            const currentTitle = titleSpan.textContent;

            const newTitle = prompt('Enter new conversation name:', currentTitle);
            
            if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
                const trimmedTitle = newTitle.trim();
                
                // Optimistically update UI
                titleSpan.textContent = trimmedTitle;
                
                // Update in backend if connected
                if (isBackendConnected && currentUser) {
                    try {
                        const result = await API.Conversations.update(conversationId, { title: trimmedTitle });
                        if (result.success) {
                            console.log(`✅ Renamed conversation ${conversationId} to: ${trimmedTitle}`);
                            showNotification('Conversation renamed successfully', 'success');
                        } else {
                            // Revert on failure
                            titleSpan.textContent = currentTitle;
                            showNotification('Failed to rename conversation', 'error');
                        }
                    } catch (error) {
                        console.error('❌ Error renaming conversation:', error);
                        // Revert on error
                        titleSpan.textContent = currentTitle;
                        showNotification('Failed to rename conversation', 'error');
                    }
                } else {
                    // Show notification for local rename only
                    showNotification('Conversation renamed (local only)', 'success');
                }
            }
        }

        async function togglePinConversation(conversationId) {
            if (activeConversationMenu) {
                activeConversationMenu.remove();
                activeConversationMenu = null;
            }

            const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            if (!conversationItem) {
                console.warn('Conversation not found:', conversationId);
                return;
            }

            try {
                // Check if already pinned
                const isPinned = conversationItem.classList.contains('pinned');
                const newPinnedState = !isPinned;

                // Show notification immediately
                if (newPinnedState) {
                    showNotification('Chat pinned to top', 'success');
                } else {
                    showNotification('Chat unpinned', 'info');
                }

                // Update backend
                const result = await API.Conversations.update(conversationId, {
                    isPinned: newPinnedState
                });

                if (result.success) {
                    // Reload the conversation list to resort pinned conversations to top
                    console.log(`✅ Conversation ${conversationId} pin status updated to: ${newPinnedState}`);
                    await loadUserChatHistory();
                } else {
                    showNotification('Failed to update pin status', 'error');
                    console.error('Failed to update pin status for conversation:', conversationId);
                }
            } catch (error) {
                console.error('❌ Error updating pin status:', error);
                showNotification('Failed to update pin status: ' + error.message, 'error');
            }
        }

        async function generateConversationTitle(conversationId) {
            if (activeConversationMenu) {
                activeConversationMenu.remove();
                activeConversationMenu = null;
            }

            const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            if (!conversationItem) return;
            const titleSpan = conversationItem.querySelector('span');
            const currentTitle = titleSpan.textContent;

            // Check if backend is connected
            if (!isBackendConnected) {
                showNotification('Title generation requires backend connection', 'error');
                return;
            }

            try {
                // Show loading state
                const originalTitle = titleSpan.textContent;
                titleSpan.textContent = 'Generating title...';
                showNotification('Generating smart title...', 'info');

                // Call the title generation API
                const result = await API.Conversations.generateTitle(conversationId);
                
                if (result.success && result.newTitle) {
                    titleSpan.textContent = result.newTitle;
                    console.log(`✅ Generated new title for conversation ${conversationId}: "${result.newTitle}"`);
                    showNotification('Title generated successfully!', 'success');
                } else {
                    // Revert on failure
                    titleSpan.textContent = originalTitle;
                    showNotification('Failed to generate title', 'error');
                }
            } catch (error) {
                console.error('❌ Error generating title:', error);
                // Revert on error
                titleSpan.textContent = currentTitle;
                showNotification('Failed to generate title: ' + error.message, 'error');
            }
        }

        function deleteConversation(conversationId) {
            if (activeConversationMenu) {
                activeConversationMenu.remove();
                activeConversationMenu = null;
            }

            const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            if (!conversationItem) return;
            const conversationTitle = conversationItem.querySelector('span').textContent;

            if (confirm(`Are you sure you want to delete "${conversationTitle}"?\n\nThis action cannot be undone.`)) {
                // Animate removal
                conversationItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                conversationItem.style.opacity = '0';
                conversationItem.style.transform = 'translateX(-20px)';
                
                setTimeout(async () => {
                    conversationItem.remove();
                    
                    // Delete from backend if connected
                    if (isBackendConnected && currentUser) {
                        try {
                            await API.Conversations.delete(conversationId);
                            console.log(`✅ Deleted conversation ${conversationId} from backend`);
                        } catch (error) {
                            console.error('❌ Error deleting conversation from backend:', error);
                            showNotification('Failed to delete conversation from server', 'error');
                            // Reload to restore the deleted conversation
                            setTimeout(() => {
                                loadUserChatHistory();
                            }, 1000);
                            return;
                        }
                    }
                    
                    // If this was the active conversation, load another one or create new chat
                    if (currentConversationId === conversationId) {
                        const firstConversation = document.querySelector('.conversation-item');
                        if (firstConversation) {
                            const firstId = firstConversation.dataset.conversationId;
                            loadConversationById(firstId);
                        } else {
                            newChat();
                        }
                    }
                }, 300);

                showNotification('Conversation deleted', 'success');
            }
        }

        // Delete All Conversations
        async function deleteAllConversations() {
            const conversationItems = document.querySelectorAll('.conversation-item');
            
            if (conversationItems.length === 0) {
                showNotification('No conversations to delete', 'info');
                return;
            }

            if (confirm(`Are you sure you want to permanently delete ALL ${conversationItems.length} conversations?\n\nThis action cannot be undone.`)) {
                try {
                    // Delete from backend if connected
                    if (isBackendConnected && currentUser) {
                        const response = await API.Conversations.deleteAll();
                        console.log(`✅ Deleted all conversations from backend:`, response);
                        showNotification(`All conversations deleted successfully (${response.deletedConversations} chats, ${response.deletedMessages} messages)`, 'success');
                    }
                    
                    // Animate and remove all conversation items from UI
                    conversationItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                            item.style.opacity = '0';
                            item.style.transform = 'translateX(-20px)';
                            
                            setTimeout(() => {
                                item.remove();
                            }, 300);
                        }, index * 50); // Stagger the animations
                    });

                    // After all are deleted, start a new chat
                    setTimeout(() => {
                        newChat();
                    }, conversationItems.length * 50 + 300);

                } catch (error) {
                    console.error('❌ Error deleting all conversations:', error);
                    showNotification('Failed to delete all conversations', 'error');
                }
            }
        }
        window.deleteAllConversations = deleteAllConversations;

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            const colors = {
                success: 'var(--success)',
                error: 'var(--danger)',
                info: 'var(--primary)'
            };
            
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${colors[type] || colors.info};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: var(--shadow-lg);
                z-index: 10000;
                animation: slideInRight 0.3s ease;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        // Search Chats Function
        function searchChats() {
            const sidebar = document.querySelector('.sidebar');
            const searchInput = document.getElementById('searchInput');
            
            if (!sidebar.classList.contains('expanded')) {
                sidebar.classList.add('expanded');
            }
            
            // Focus on search input
            setTimeout(() => {
                searchInput.focus();
            }, 100);
        }

        // Filter Conversations
        function filterConversations() {
            const searchInput = document.getElementById('searchInput');
            const searchTerm = searchInput.value.toLowerCase().trim();
            const conversationItems = document.querySelectorAll('.conversation-item');
            
            conversationItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // If search is empty, show all
            if (searchTerm === '') {
                conversationItems.forEach(item => {
                    item.style.display = 'flex';
                });
            }
        }

        // Close Search
        function closeSearch() {
            const searchInput = document.getElementById('searchInput');
            searchInput.value = '';
            filterConversations(); // Reset filter
        }
        window.closeSearch = closeSearch;

        // File Upload
        function setupFileUpload() {
            const fileInput = document.getElementById('fileInput');
            const photoInput = document.getElementById('photoInput');
            
            // OLD LISTENERS - REMOVED - Using DOMContentLoaded listeners instead
            // fileInput.addEventListener('change', function(e) { ... });
            // photoInput.addEventListener('change', function(e) { ... });
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        // More Options Menu
        function toggleMoreOptions() {
            const menu = document.getElementById('moreOptionsMenu');
            menu.classList.toggle('show');
        }

        function toggleChatMoreOptions() {
            const menu = document.getElementById('moreOptionsMenu');
            menu.classList.toggle('show');
        }
        window.toggleChatMoreOptions = toggleChatMoreOptions;

        function selectMoreOption(option) {
            if (option === 'video') {
                showVideoModal();
                toggleChatMoreOptions();
                return;
            }

            if (option === 'generatePdf') {
                const input = document.getElementById('chatInput');
                input.placeholder = 'Enter a topic for PDF generation (e.g., "Write about AI in healthcare")';
                input.focus();
                toggleChatMoreOptions();
                
                // Add special handler for next message
                window.nextMessageIsPdf = true;
                return;
            }

            if (option === 'generateDocx') {
                const input = document.getElementById('chatInput');
                input.placeholder = 'Enter a topic for DOCX generation (e.g., "Write about renewable energy")';
                input.focus();
                toggleChatMoreOptions();
                
                // Add special handler for next message
                window.nextMessageIsDocx = true;
                return;
            }

            const options = {
                'createImage': 'Create an image for me',
                'thinking': 'Help me think through this',
                'research': 'Do deep research on',
                'study': 'Help me study and learn about',
                'webSearch': 'Search the web for',
                'canvas': 'Create a canvas for'
            };
            const input = document.getElementById('chatInput');
            input.value = options[option] + '...';
            input.focus();
            toggleChatMoreOptions();
            updateCharCounter();
        }

        // Generate smart title from voice input
        function generateSmartTitle(message) {
            // Check for random keyboard input
            if (!message || message.length === 0) {
                return 'Voice Chat';
            }
            
            // Detect random keyboard input (repeated chars, gibberish)
            const randomPattern = /^([a-z])\1{3,}|^[qwertyuiopasdfghjklzxcvbnm]{8,}$/i;
            if (randomPattern.test(message.trim())) {
                return 'Keyboard Test';
            }
            
            // Clean the message
            const cleanMessage = message.replace(/[^\w\s]/g, ' ').trim();
            if (cleanMessage.length < 3) {
                return 'Quick Chat';
            }
            
            // Stop words to filter out
            const stopWords = new Set([
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
                'from', 'up', 'about', 'into', 'through', 'during', 'is', 'are', 'was', 'were', 'be', 'been',
                'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can',
                'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
                'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those'
            ]);
            
            // Extract meaningful words
            const words = cleanMessage
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 2 && !stopWords.has(word))
                .slice(0, 8);
            
            if (words.length === 0) {
                return 'Quick Chat';
            }
            
            // Capitalize first letter of each word
            const title = words
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .slice(0, 60);
            
            return title || 'Voice Chat';
        }

        // Voice Mode
        // Speech Recognition Variables are already declared at the top level

        // Network status monitoring for speech recognition
        function setupNetworkListeners() {
            // Monitor online/offline status
            window.addEventListener('online', () => {
                console.log('✅ Connection restored - Speech recognition available');
                // If voice assistant was active, try to reinitialize
                if (isVoiceAssistantActive && !recognition) {
                    initializeSpeechRecognition();
                }
            });

            window.addEventListener('offline', () => {
                console.warn('⚠️ Connection lost - Speech recognition may not work');
                // Stop recognition if it's running
                if (recognition) {
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.error('Error stopping recognition:', e);
                    }
                }
            });
        }

        function initializeSpeechRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.language = 'en-US';
                    recognition.maxAlternatives = 1;
                    
                    // Add connection check
                    if (!navigator.onLine) {
                        console.warn('⚠️ No internet connection detected. Speech recognition may not work properly.');
                    }
                } catch (error) {
                    console.error('❌ Failed to initialize speech recognition:', error);
                    return;
                }

                recognition.onstart = () => {
                    console.log('🎤 Speech recognition started');
                    isRecording = true;
                    document.querySelector('.voice-mic-btn')?.classList.add('recording');
                };

                recognition.onresult = (event) => {
                    let interimTranscript = '';
                    let finalTranscript = '';
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript + ' ';
                        } else {
                            interimTranscript += transcript;
                        }
                    }
                    
                    // Display interim results
                    if (interimTranscript) {
                        console.log('🎤 Interim:', interimTranscript);
                    }
                    
                    // Process final transcript
                    if (finalTranscript.trim()) {
                        const chatInput = document.getElementById('chatInput');
                        
                        if (isVoiceAssistantActive) {
                            // Voice Assistant Mode: Auto-send and speak response
                            console.log('🎤 Final transcription:', finalTranscript.trim());
                            addMessage(finalTranscript.trim(), 'user');
                            
                            // Get AI response and speak it
                            aiReply(finalTranscript.trim()).then(response => {
                                if (response) {
                                    console.log('🤖 AI Response:', response);
                                    addMessage(response, 'assistant');
                                    speak(response); // Speak the response back to user
                                    
                                    // Continue listening for next input
                                    setTimeout(() => {
                                        if (isVoiceAssistantActive && recognition) {
                                            try {
                                                recognition.start();
                                                console.log('🎤 Ready for next voice input...');
                                            } catch (e) {
                                                console.error('Error restarting recognition:', e);
                                            }
                                        }
                                    }, 1000);
                                }
                            }).catch(error => {
                                console.error('Error getting AI response:', error);
                                addMessage('Sorry, I encountered an error processing your voice.', 'assistant');
                            });
                        } else {
                            // Regular Voice Mode: Just add to input
                            if (chatInput) {
                                chatInput.value += (chatInput.value ? ' ' : '') + finalTranscript.trim();
                                updateCharCounter();
                            }
                        }
                    }
                };

                recognition.onerror = (event) => {
                    console.error('❌ Speech recognition error:', event.error);
                    
                    // Handle different error types
                    switch(event.error) {
                        case 'no-speech':
                            console.log('ℹ️ No speech detected, continuing to listen...');
                            // Don't show error for no-speech, just keep listening
                            break;
                            
                        case 'network':
                            console.warn('⚠️ Network error - Speech recognition may require internet connection');
                            // Try to reinitialize after network error
                            if (isVoiceAssistantActive) {
                                setTimeout(() => {
                                    try {
                                        if (recognition && isVoiceAssistantActive) {
                                            recognition.start();
                                            console.log('🔄 Retrying speech recognition...');
                                        }
                                    } catch (e) {
                                        console.error('Failed to restart after network error:', e);
                                    }
                                }, 1000);
                            }
                            break;
                            
                        case 'audio-capture':
                            addMessage('❌ Microphone access error. Please check your microphone permissions.', 'assistant');
                            isVoiceAssistantActive = false;
                            document.querySelector('.voice-assistant-btn')?.classList.remove('active');
                            break;
                            
                        case 'not-allowed':
                            addMessage('❌ Microphone permission denied. Please allow microphone access in your browser settings.', 'assistant');
                            isVoiceAssistantActive = false;
                            document.querySelector('.voice-assistant-btn')?.classList.remove('active');
                            break;
                            
                        case 'aborted':
                            console.log('ℹ️ Speech recognition aborted');
                            break;
                            
                        case 'service-not-allowed':
                            console.warn('⚠️ Speech recognition service not allowed. May require HTTPS or proper permissions.');
                            addMessage('⚠️ Speech recognition requires a secure connection (HTTPS). Please check your connection.', 'assistant');
                            break;
                            
                        default:
                            console.error('Unhandled speech recognition error:', event.error);
                            break;
                    }
                };

                recognition.onend = () => {
                    console.log('🎤 Speech recognition ended');
                    isRecording = false;
                    document.querySelector('.voice-mic-btn')?.classList.remove('recording');
                    
                    // If voice assistant is still active, restart listening
                    if (isVoiceAssistantActive) {
                        setTimeout(() => {
                            if (isVoiceAssistantActive && recognition && navigator.onLine) {
                                try {
                                    recognition.start();
                                    console.log('🎤 Restarted listening for voice assistant...');
                                } catch (e) {
                                    console.error('Error restarting recognition:', e);
                                    // If restart fails, try reinitializing
                                    if (e.name === 'InvalidStateError') {
                                        console.log('🔄 Reinitializing speech recognition...');
                                        initializeSpeechRecognition();
                                        setTimeout(() => {
                                            if (recognition && isVoiceAssistantActive) {
                                                try {
                                                    recognition.start();
                                                } catch (err) {
                                                    console.error('Failed to restart after reinitialization:', err);
                                                }
                                            }
                                        }, 500);
                                    }
                                }
                            } else if (!navigator.onLine) {
                                console.warn('⚠️ Cannot restart speech recognition - no internet connection');
                            }
                        }, 500);
                    }
                };
            } else {
                console.warn('Speech Recognition API not supported');
            }
        }

        function toggleVoiceMode() {
            // Require authentication
            if (!requireAuth('live transcription')) {
                return;
            }

            if (!recognition) {
                initializeSpeechRecognition();
            }

            const voiceModal = document.getElementById('voiceModal');
            
            if (!isRecording) {
                // Start recording
                voiceModal.classList.add('active');
                isVoiceActive = true;
                isRecording = true;
                try {
                    recognition.start();
                    console.log('🎤 Started listening...');
                } catch (error) {
                    console.error('Error starting recognition:', error);
                    isRecording = false;
                }
            } else {
                // Stop recording
                isRecording = false;
                try {
                    recognition.stop();
                    console.log('🎤 Stopped listening');
                    voiceModal.classList.remove('active');
                    isVoiceActive = false;
                } catch (error) {
                    console.error('Error stopping recognition:', error);
                }
            }
        }
        window.toggleVoiceMode = toggleVoiceMode;

        function closeVoiceModal() {
            const voiceModal = document.getElementById('voiceModal');
            voiceModal.classList.remove('active');
            isVoiceActive = false;
            if (isRecording && recognition) {
                try {
                    recognition.stop();
                } catch (error) {
                    console.error('Error stopping recognition:', error);
                }
            }
        }
        window.closeVoiceModal = closeVoiceModal;

        function toggleVoiceRecording() {
            // This will be triggered by the mic button in the voice modal
            if (isRecording) {
                isRecording = false;
                try {
                    recognition.stop();
                    console.log('🎤 Stopped recording via modal button');
                    closeVoiceModal();
                } catch (error) {
                    console.error('Error stopping recognition:', error);
                }
            } else {
                isRecording = true;
                try {
                    recognition.start();
                    console.log('🎤 Started recording via modal button');
                } catch (error) {
                    console.error('Error starting recognition:', error);
                    isRecording = false;
                }
            }
        }
        window.toggleVoiceRecording = toggleVoiceRecording;

        function openVoiceSettings() {
            closeVoiceModal();
            addMessage('Voice settings coming soon!', 'assistant');
        }
        window.openVoiceSettings = openVoiceSettings;

        // 📁 Speech-to-Text Transcription (File Upload)
        async function transcribeAudioFile() {
            // Require authentication
            if (!requireAuth('audio transcription')) {
                return;
            }

            try {
                // Create a file input element
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'audio/*';
                
                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    console.log('🎤 Selected audio file:', file.name);
                    
                    // Add loading message
                    const loadingMsg = addMessage('Transcribing audio...', 'assistant');
                    
                    try {
                        // Create form data
                        const formData = new FormData();
                        formData.append('audio', file);

                        // Get auth token
                        const token = localStorage.getItem('authToken') || sessionStorage.getItem('token');

                        // Determine the API base URL
                        const apiBaseUrl = window.location.origin === 'file://' 
                            ? 'http://localhost:3000' 
                            : window.location.origin;
                        const apiUrl = `${apiBaseUrl}/api/ai/speech-to-text`;

                        // Send to server
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                            body: formData
                        });

                        const data = await response.json();

                        if (response.ok && data.success) {
                            console.log('✅ Transcription successful:', data.text);
                            
                            // Remove loading message
                            if (loadingMsg) loadingMsg.remove();
                            
                            // Add transcribed text to input
                            const chatInput = document.getElementById('chatInput');
                            if (chatInput) {
                                chatInput.value = (chatInput.value ? chatInput.value + '\n\n' : '') + data.text;
                                updateCharCounter();
                                chatInput.focus();
                            }
                            
                            // Show success message
                            addMessage(`✅ Transcribed: "${data.text.substring(0, 100)}${data.text.length > 100 ? '...' : ''}"`, 'assistant');
                        } else {
                            console.error('❌ Transcription failed:', data.error);
                            if (loadingMsg) loadingMsg.remove();
                            addMessage(`❌ Transcription failed: ${data.error}`, 'assistant');
                        }
                    } catch (error) {
                        console.error('❌ Error uploading audio:', error);
                        if (loadingMsg) loadingMsg.remove();
                        addMessage('Error: Could not transcribe audio. Please try again.', 'assistant');
                    }
                };

                // Trigger file picker
                fileInput.click();
            } catch (error) {
                console.error('❌ Error opening file picker:', error);
                addMessage('Error opening file picker.', 'assistant');
            }
        }
        window.transcribeAudioFile = transcribeAudioFile;

        // 🎤 Voice Assistant Functions
        function setVoice(style) {
            voiceStyle = style;
            console.log('Voice style set to:', voiceStyle);
        }

        // Initialize Speech Recognition

        // 🧠 AI Chat using Backend Server (fixes CORS)
        async function aiReply(input) {
            try {
                // Create conversation if needed
                if (!currentConversationId) {
                    // Generate smart title from the first voice input
                    const smartTitle = generateSmartTitle(input);
                    const convResult = await API.Conversations.create(smartTitle);
                    currentConversationId = convResult.conversation._id || convResult.conversation.id;
                }
                
                // Use backend messages endpoint to process voice message
                const res = await fetch(`${API_BASE_URL}/api/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': currentUser && currentUser.userId ? currentUser.userId : 'voice-user'
                    },
                    body: JSON.stringify({ 
                        conversationId: currentConversationId,
                        content: input,
                        responseType: currentQuickResponse || 'balanced'
                    })
                });

                if (!res.ok) {
                    console.error('API response status:', res.status);
                    throw new Error(`API error: ${res.status}`);
                }

                const data = await res.json();
                
                if (data.success && data.aiMessage) {
                    console.log('✅ Voice chat reply received');
                    return data.aiMessage.content || "I couldn't generate a response. Please try again.";
                } else if (data.error) {
                    console.error('Voice chat API error:', data.error);
                    return "I encountered an error processing your voice. Please try again.";
                } else {
                    console.warn('Unexpected API response:', data);
                    return "I'm having trouble understanding. Could you please repeat that?";
                }
            } catch (error) {
                console.error('❌ Error calling voice chat API:', error);
                // Fallback to mock response when backend is unavailable
                const mockResponses = [
                    "That's a great question! Let me think about that.",
                    "Interesting point! I can help you with that.",
                    "I understand. Let me provide some insight on that topic.",
                    "Good observation! Here's what I think about that."
                ];
                return mockResponses[Math.floor(Math.random() * mockResponses.length)];
            }
        }

        // 🔊 Text-to-Speech with Voice Styles: Sol / Juniper
        function speak(text) {
            if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Wait for voices to load
                const setVoiceAndSpeak = () => {
                    const voices = speechSynthesis.getVoices();
                    
                    if (voices.length > 0) {
                        // Try to find a female voice
                        const femaleVoice = voices.find(v => 
                            v.name.toLowerCase().includes('female') || 
                            v.name.toLowerCase().includes('samantha') || 
                            v.name.toLowerCase().includes('zira') ||
                            v.name.toLowerCase().includes('susan') ||
                            v.name.toLowerCase().includes('karen') ||
                            v.name.toLowerCase().includes('moira') ||
                            v.name.toLowerCase().includes('tessa') ||
                            v.name.toLowerCase().includes('victoria') ||
                            v.name.toLowerCase().includes('fiona') ||
                            v.lang.includes('en') && v.name.includes('Female')
                        );
                        
                        // Use female voice if found, otherwise use first available
                        utterance.voice = femaleVoice || voices[0];
                        
                        // Apply voice style settings
                        if (voiceStyle === "juniper") {
                            utterance.pitch = 1.3;   // softer, smarter
                            utterance.rate = 1.05;
                        } else if (voiceStyle === "sol") {
                            utterance.pitch = 1.1;   // gentle, calm (adjusted for female)
                            utterance.rate = 0.95;
                        } else {
                            // Default settings
                            utterance.pitch = 1.0;
                            utterance.rate = 1.0;
                        }
                        
                        utterance.volume = 1.0;
                        
                        console.log('Speaking with voice style:', voiceStyle, '| Voice:', utterance.voice.name);
                        speechSynthesis.speak(utterance);
                    }
                };
                
                // Voices might not be loaded immediately
                if (speechSynthesis.getVoices().length > 0) {
                    setVoiceAndSpeak();
                } else {
                    speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
                }
            } else {
                console.error('Text-to-speech not supported in this browser');
            }
        }

        // Update audio button visual state
        function updateAudioButtonState() {
            const audioBtn = document.querySelector('.audio-btn');
            if (audioBtn) {
                if (isVoiceAssistantActive) {
                    audioBtn.classList.add('active');
                    audioBtn.style.color = '#10b981';
                } else {
                    audioBtn.classList.remove('active');
                    audioBtn.style.color = '';
                }
            }
        }

        // Audio Toggle - Main function for AI Voice Assistant
        function startListening() {
            if (!recognition) {
                initializeSpeechRecognition();
            }
            try {
                recognition.start();
                console.log('🎤 Started listening for voice input...');
            } catch (error) {
                console.error('Error starting recognition:', error);
            }
        }

        function stopListening() {
            if (recognition) {
                try {
                    isVoiceAssistantActive = false;
                    recognition.stop();
                    console.log('🎤 Stopped listening');
                } catch (error) {
                    console.error('Error stopping recognition:', error);
                }
            }
        }

        function toggleAudio() {
            // Require authentication
            if (!requireAuth('AI voice assistant')) {
                return;
            }

            isVoiceAssistantActive = !isVoiceAssistantActive;
            
            if (isVoiceAssistantActive) {
                console.log('🎙 AI Voice Assistant activated');
                addMessage('AI Voice Assistant activated! Speak now...', 'assistant');
                startListening();
            } else {
                console.log('🔇 AI Voice Assistant deactivated');
                addMessage('AI Voice Assistant deactivated.', 'assistant');
                stopListening();
                speechSynthesis.cancel();
            }
            
            updateAudioButtonState();
        }
        window.toggleAudio = toggleAudio;

        // Message Action Functions
        function copyMessage(btn) {
            const bubble = btn.closest('.message').querySelector('.message-bubble');
            const text = bubble.textContent;
            navigator.clipboard.writeText(text).then(() => {
                const originalIcon = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    btn.innerHTML = originalIcon;
                }, 1500);
            });
        }

        async function likeMessage(btn) {
            const messageDiv = btn.closest('.message');
            const messageId = messageDiv.dataset.messageId;
            
            btn.style.color = '#10b981';
            
            if (isBackendConnected && messageId) {
                try {
                    await API.Messages.addReaction(messageId, 'like');
                    console.log('✅ Reaction added');
                } catch (error) {
                    console.error('❌ Error adding reaction:', error);
                }
            }
            
            setTimeout(() => {
                btn.style.color = '';
            }, 2000);
        }

        async function dislikeMessage(btn) {
            const messageDiv = btn.closest('.message');
            const messageId = messageDiv.dataset.messageId;
            
            btn.style.color = '#ef4444';
            
            if (isBackendConnected && messageId) {
                try {
                    await API.Messages.addReaction(messageId, 'dislike');
                    console.log('✅ Reaction added');
                } catch (error) {
                    console.error('❌ Error adding reaction:', error);
                }
            }
            
            setTimeout(() => {
                btn.style.color = '';
            }, 2000);
        }

        function shareMessage(btn) {
            const bubble = btn.closest('.message').querySelector('.message-bubble');
            const text = bubble.textContent;
            if (navigator.share) {
                navigator.share({
                    title: 'Copilot Message',
                    text: text
                });
            } else {
                copyMessage(btn);
            }
        }

        async function refreshMessage(btn) {
            const messageDiv = btn.closest('.message');
            const bubble = messageDiv.querySelector('.message-bubble');
            const originalText = bubble.textContent;
            
            bubble.textContent = 'Regenerating response...';
            
            if (isBackendConnected && currentConversationId) {
                try {
                    // Get the message ID from the element (we'll need to store this)
                    const messageId = messageDiv.dataset.messageId;
                    
                    if (messageId) {
                        const result = await API.Messages.regenerate(messageId, currentQuickResponse || 'balanced');
                        bubble.textContent = result.message.content;
                        console.log('✅ Message regenerated');
                    } else {
                        // Fallback to mock regeneration
                        setTimeout(() => {
                            bubble.textContent = 'This is a regenerated response with updated information and fresh perspective on your query.';
                        }, 1000);
                    }
                } catch (error) {
                    console.error('❌ Error regenerating:', error);
                    setTimeout(() => {
                        bubble.textContent = originalText;
                    }, 500);
                }
            } else {
                // Mock regeneration
                setTimeout(() => {
                    bubble.textContent = 'This is a regenerated response with updated information and fresh perspective on your query.';
                }, 1000);
            }
        }

        function moreMessageActions(btn) {
            addMessage('More message actions coming soon!', 'assistant');
        }

        function reportMessage(btn) {
            const bubble = btn.closest('.message').querySelector('.message-bubble');
            const text = bubble.textContent;
            if (confirm('Report this message?\n\n"' + text.substring(0, 50) + '..."')) {
                addMessage('Thank you for your report. We will review this message.', 'assistant');
            }
        }

        function editMessage(btn) {
            const messageDiv = btn.closest('.message');
            const bubble = messageDiv.querySelector('.message-bubble');
            const currentText = bubble.textContent;
            
            // Create edit input if not already in edit mode
            if (messageDiv.querySelector('.edit-message-container')) return;
            
            // Hide the original bubble
            bubble.style.display = 'none';
            
            // Create edit container
            const editContainer = document.createElement('div');
            editContainer.className = 'edit-message-container';
            
            const editTextarea = document.createElement('textarea');
            editTextarea.className = 'edit-message-input';
            editTextarea.value = currentText;
            editTextarea.rows = 3;
            
            const editActions = document.createElement('div');
            editActions.className = 'edit-message-actions';
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'edit-save-btn';
            saveBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Save & Submit';
            saveBtn.onclick = function() {
                saveAndResendMessage(messageDiv, editTextarea.value);
            };
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'edit-cancel-btn';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            cancelBtn.onclick = function() {
                cancelEdit(messageDiv);
            };
            
            editActions.appendChild(cancelBtn);
            editActions.appendChild(saveBtn);
            
            editContainer.appendChild(editTextarea);
            editContainer.appendChild(editActions);
            
            // Insert after bubble
            bubble.parentNode.insertBefore(editContainer, bubble.nextSibling);
            
            // Focus and resize
            editTextarea.focus();
            autoResizeTextarea(editTextarea);
        }

        function cancelEdit(messageDiv) {
            const editContainer = messageDiv.querySelector('.edit-message-container');
            const bubble = messageDiv.querySelector('.message-bubble');
            
            if (editContainer) {
                editContainer.remove();
            }
            bubble.style.display = '';
        }

        function saveAndResendMessage(messageDiv, newText) {
            if (!newText.trim()) return;
            
            const bubble = messageDiv.querySelector('.message-bubble');
            const editContainer = messageDiv.querySelector('.edit-message-container');
            
            // Update the message text
            bubble.textContent = newText;
            bubble.style.display = '';
            
            // Remove edit container
            if (editContainer) {
                editContainer.remove();
            }
            
            // Remove all messages after this one
            let nextMessage = messageDiv.nextElementSibling;
            while (nextMessage) {
                const toRemove = nextMessage;
                nextMessage = nextMessage.nextElementSibling;
                if (toRemove.classList.contains('message')) {
                    toRemove.remove();
                }
            }
            
            // Regenerate response
            setTimeout(() => {
                const responses = {
                    'concise': 'Got it. Here\'s a concise response: That\'s a great idea. I can help you with that.',
                    'balanced': 'That\'s an interesting question. Let me provide a balanced perspective on this.',
                    'detailed': 'Great question! Let me give you a detailed analysis: This topic has several important aspects to consider. First, we should understand the broader context...',
                    'creative': 'What a creative prompt! Let me think outside the box here. Imagine if we approached this from a completely different angle...'
                };
                addMessage(responses[currentQuickResponse] || responses['balanced'], 'assistant');
            }, 800);
        }

        // Theme Functions
        function toggleTheme() {
            const body = document.body;
            const themeBtn = document.querySelector('.theme-toggle i');

            if (body.classList.contains('dark-theme')) {
                body.classList.remove('dark-theme');
                body.classList.add('light-theme');
                themeBtn.className = 'fas fa-moon';
                localStorage.setItem('theme', 'light');
            } else if (body.classList.contains('light-theme')) {
                body.classList.remove('light-theme');
                body.classList.add('curious-theme');
                themeBtn.className = 'fas fa-wand-magic-sparkles';
                localStorage.setItem('theme', 'curious');
            } else if (body.classList.contains('curious-theme')) {
                body.classList.remove('curious-theme');
                body.classList.add('dark-theme');
                themeBtn.className = 'fas fa-sun';
                localStorage.setItem('theme', 'dark');
            } else {
                body.classList.add('dark-theme');
                themeBtn.className = 'fas fa-sun';
                localStorage.setItem('theme', 'dark');
            }
        }
        window.toggleTheme = toggleTheme;

        function loadTheme() {
            const savedTheme = localStorage.getItem('theme');
            const body = document.body;
            const icon = document.querySelector('.theme-toggle i');
            body.classList.remove('dark-theme', 'light-theme', 'curious-theme');
            if (savedTheme === 'light') {
                body.classList.add('light-theme');
                icon.className = 'fas fa-moon';
            } else if (savedTheme === 'curious') {
                body.classList.add('curious-theme');
                icon.className = 'fas fa-wand-magic-sparkles';
            } else {
                body.classList.add('dark-theme');
                icon.className = 'fas fa-sun';
            }
        }

          // Chat Functions
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                // Check if device is mobile
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
                
                if (isMobile) {
                    // On mobile: Ctrl+Enter sends, Enter adds new line
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        sendMessage();
                    }
                    // Allow default behavior for new line
                } else {
                    // On desktop: Enter adds new line, Ctrl+Enter or Shift+Enter sends
                    if (event.ctrlKey || event.metaKey || event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                    }
                    // Allow default behavior for new line
                }
            }
        }
        window.handleKeyPress = handleKeyPress;

        // Add new line at cursor position (for mobile new line button)
        function insertNewLine() {
            const input = document.getElementById('chatInput');
            if (!input) return;
            
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const value = input.value;
            
            input.value = value.substring(0, start) + '\n' + value.substring(end);
            input.selectionStart = input.selectionEnd = start + 1;
            
            // Trigger resize
            updateCharCounter();
            input.focus();
        }
        window.insertNewLine = insertNewLine;

        function autoResizeTextarea(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
        }

        function updateCharCounter() {
            const input = document.getElementById('chatInput');
            charCount = input.value.length;
            if (charCount > 2000) {
                input.value = input.value.substring(0, 2000);
                charCount = 2000;
            }
            autoResizeTextarea(input);
        }
        window.updateCharCounter = updateCharCounter;

        // Set up event listeners for chat input
        document.addEventListener('DOMContentLoaded', () => {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.addEventListener('keydown', handleKeyPress);
                chatInput.addEventListener('input', updateCharCounter);
            }
        });

        // --- Conversation memory helpers (simple local memory) ---
        function saveMessage(role, text) {
            // role: 'user' or 'ai'
            conversation.push({ role, text });
            console.log('Conversation memory:', conversation);
        }

        function showMessage(role, text) {
            // Map incoming roles to UI senders
            const sender = (role === 'ai') ? 'assistant' : 'user';
            addMessage(text, sender);
        }

        function generateReply(message) {
            const msg = message.toLowerCase();

            // Look at previous message
            let lastUserMessage = '';
            for (let i = conversation.length - 1; i >= 0; i--) {
                if (conversation[i].role === 'user') {
                    lastUserMessage = conversation[i].text.toLowerCase();
                    break;
                }
            }

            // Context based response
            if (msg.includes('hello') || msg.includes('hi')) {
                return "Hello! I am your personal AI. How can I help you?";
            }

            if (msg.includes('previous') || msg.includes('last')) {
                return "I can see your previous messages in this chat and use them to answer.";
            }

            if (lastUserMessage.includes('project')) {
                return "Since you're talking about a project, I can help you build or improve it.";
            }

            if (msg.includes('ai')) {
                return "AI systems use memory, context, and logic to generate intelligent replies.";
            }

            // Default reply
            return "I am learning from our conversation. Tell me more.";
        }

        // Show typing indicator
function showTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.classList.remove('hidden');
  }
}

// Hide typing indicator
function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.classList.add('hidden');
  }
}

// Use it when calling API
async function sendMessage(userMessage) {
  showTypingIndicator(); // Show loading
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    });
    
    const data = await response.json();
    // Process response...
  } finally {
    hideTypingIndicator(); // Hide when done
  }
}

        function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            // Mark chat as started (ChatGPT-like behavior)
            const chatContainer = document.getElementById('chatContainer') || 
                                 document.querySelector('.chat-container') || 
                                 document.querySelector('.main-content');
            if (chatContainer && !chatContainer.classList.contains('chat-started')) {
                chatContainer.classList.add('chat-started');
            }

            // Check if this message is for PDF generation
            if (window.nextMessageIsPdf) {
                window.nextMessageIsPdf = false;
                input.placeholder = 'Ask anything';
                generatePdfFromChat();
                return;
            }

            // Check if this message is for DOCX generation
            if (window.nextMessageIsDocx) {
                window.nextMessageIsDocx = false;
                input.placeholder = 'Ask anything';
                generateDocxFromChat();
                return;
            }

            // Check if message is a PDF generation request
            const pdfPrompt = detectPdfRequest(message);
            if (pdfPrompt) {
                // save to conversation memory as user
                try { saveMessage('user', message); } catch (e) {}
                addMessage(message, 'user');
                input.value = '';
                charCount = 0;
                input.style.height = 'auto';
                createAIPdf(pdfPrompt);
                
                // Auto scroll to bottom
                scrollToBottom();
                
                // Auto-focus input
                setTimeout(() => input.focus(), 100);
                return;
            }

            // Check if message is a DOCX generation request
            const docxPrompt = detectDocxRequest(message);
            if (docxPrompt) {
                // save to conversation memory as user
                try { saveMessage('user', message); } catch (e) {}
                addMessage(message, 'user');
                input.value = '';
                charCount = 0;
                input.style.height = 'auto';
                createAIDocx(docxPrompt);
                
                // Auto scroll to bottom
                scrollToBottom();
                
                // Auto-focus input
                setTimeout(() => input.focus(), 100);
                return;
            }

            // Check if message is a podcast generation request
            const podcastTopic = detectPodcastRequest(message);
            if (podcastTopic) {
                // save to conversation memory as user
                try { saveMessage('user', message); } catch (e) {}
                input.value = '';
                charCount = 0;
                input.style.height = 'auto';
                generatePodcastFromChat(podcastTopic);
                
                // Auto scroll to bottom
                scrollToBottom();
                
                // Auto-focus input
                setTimeout(() => input.focus(), 100);
                return;
            }

            // Check if message is an image generation request
            const imagePrompt = detectImageRequest(message);
            if (imagePrompt) {
                // save to conversation memory as user
                try { saveMessage('user', message); } catch (e) {}
                addMessage(message, 'user');
                input.value = '';
                charCount = 0;
                input.style.height = 'auto';
                generateImage(imagePrompt);
                
                // Auto scroll to bottom
                scrollToBottom();
                
                // Auto-focus input
                setTimeout(() => input.focus(), 100);
                return;
            }

            // Save user message to local conversation memory
            try { saveMessage('user', message); } catch (e) {}
            addMessage(message, 'user');
            input.value = '';
            charCount = 0;
            input.style.height = 'auto'; // Reset textarea height
            
            const ag = document.getElementById('actionGrid');
            if (ag) { ag.style.opacity = '0'; ag.style.pointerEvents = 'none'; }
            const cs = document.getElementById('carouselSection');
            if (cs) { cs.style.display = 'none'; }

            // Show stop button
            showStopButton();

            // Auto scroll to bottom with delay for mobile
            setTimeout(() => {
                scrollToBottom();
            }, 100);
            
            // Additional scroll after content renders (important for mobile)
            setTimeout(() => {
                scrollToBottom();
            }, 300);
            
            // Auto-focus input after message is sent (skip on mobile to prevent keyboard jump)
            if (window.innerWidth > 768) {
                setTimeout(() => input.focus(), 100);
            }

            // Use backend if connected, otherwise use mock response
            if (isBackendConnected) {
                sendMessageToBackend(message);
            } else {
                sendMockMessage(message);
            }
        }
        window.sendMessage = sendMessage;

        // Scroll messages container to bottom (ChatGPT-like behavior)
        function scrollToBottom() {
            const messagesContainer = document.getElementById('messagesContainer') || 
                                     document.getElementById('messages') || 
                                     document.querySelector('.messages');
            
            if (messagesContainer) {
                // Use multiple approaches for better mobile compatibility
                
                // Method 1: Direct scroll (works on most browsers)
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // Method 2: scrollTo with behavior (smoother, works on modern mobile browsers)
                if (messagesContainer.scrollTo) {
                    messagesContainer.scrollTo({
                        top: messagesContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                }
                
                // Method 3: Force layout recalculation and scroll again (fixes iOS issues)
                requestAnimationFrame(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    // Double RAF for better mobile reliability
                    requestAnimationFrame(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    });
                });
            }
        }

        // Detect if user message is requesting image generation
        function detectImageRequest(message) {
            const lowerMsg = message.toLowerCase();
            
            // Skip if it's clearly a podcast, pdf, or docx request
            if (lowerMsg.includes('podcast') || lowerMsg.includes('podcaste') || 
                lowerMsg.match(/\b(?:pdf|docx|word\s+document)\b/i)) {
                return null;
            }
            
            // Patterns that indicate image generation
            const patterns = [
                /^(?:create|generate|make|draw|design|show me|give me)\s+(?:a|an|me)?\s*(?:image|picture|photo|illustration|drawing|logo|art|artwork)\s+(?:of|about|with|showing|for)?\s*(.+)$/i,
                /^(?:image|picture|photo|illustration|drawing|logo|art|artwork)\s+(?:of|about|with|showing|for)\s+(.+)$/i,
                /^(?:draw|design|illustrate|visualize|sketch)\s+(?:a|an|me)?\s*(.+)$/i
            ];
            
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return null;
        }

        // Detect PDF generation requests
        function detectPdfRequest(message) {
            const lowerMsg = message.toLowerCase();
            
            // Patterns that indicate PDF generation
            const patterns = [
                /^(?:create|generate|make|build)\s+(?:a|an)?\s*(?:pdf|document)\s+(?:about|on|for|of|regarding|with)\s+(.+)$/i,
                /^(?:pdf|document)\s+(?:about|on|for|of|regarding)\s+(.+)$/i,
                /^(?:create|generate|make)\s+(?:a|an)?\s*(.+?)\s+(?:pdf|document)$/i,
                /^write\s+(?:a|an)?\s*(?:pdf|document)\s+(?:about|on|for|of|regarding)\s+(.+)$/i,
                /^(?:create|generate)\s+(?:a|an)?\s*(?:pdf|document):\s*(.+)$/i
            ];
            
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return null;
        }

        // Detect DOCX generation requests
        function detectDocxRequest(message) {
            const lowerMsg = message.toLowerCase();
            
            // Patterns that indicate DOCX generation
            const patterns = [
                /^(?:create|generate|make|build)\s+(?:a|an)?\s*(?:docx|word\s+document|word\s+file)\s+(?:about|on|for|of|regarding|with)\s+(.+)$/i,
                /^(?:docx|word\s+document|word\s+file)\s+(?:about|on|for|of|regarding)\s+(.+)$/i,
                /^(?:create|generate|make)\s+(?:a|an)?\s*(.+?)\s+(?:docx|word\s+document|word\s+file)$/i,
                /^write\s+(?:a|an)?\s*(?:docx|word\s+document|word\s+file)\s+(?:about|on|for|of|regarding)\s+(.+)$/i,
                /^(?:create|generate)\s+(?:a|an)?\s*(?:docx|word\s+document|word\s+file):\s*(.+)$/i
            ];
            
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return null;
        }

        // Detect Podcast generation requests
        function detectPodcastRequest(message) {
            const lowerMsg = message.toLowerCase();
            
            // Patterns that indicate Podcast generation (handles both "podcast" and "podcaste" typo)
            const patterns = [
                /^(?:create|generate|make|build)\s+(?:a|an)?\s*podcaste?\s+(?:about|on|for|of|regarding|with)\s+(.+)$/i,
                /^podcaste?\s+(?:about|on|for|of|regarding)\s+(.+)$/i,
                /^(?:create|generate|make)\s+(?:a|an)?\s*(.+?)\s+podcaste?$/i,
                /^(?:record|produce)\s+(?:a|an)?\s*podcaste?\s+(?:about|on|for|of|regarding)\s+(.+)$/i,
                /^(?:create|generate)\s+(?:a|an)?\s*podcaste?:\s*(.+)$/i,
                /^(?:create|make|generate)\s+(?:a|an)?\s*(?:audio|voice|spoken)\s+(?:about|on|for|of|regarding)\s+(.+)$/i
            ];
            
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return null;
        }

        // Send message to backend API
        async function sendMessageToBackend(message) {
            // Create new abort controller for this request
            currentAbortController = new AbortController();
            isGenerating = true;
            
            try {
                // Prepare message with OCR context if available
                let fullMessage = message;
                if (currentOcrContext && currentOcrContext.trim()) {
                    fullMessage = `${currentOcrContext}\n\n---\n\nUser Question: ${message}`;
                }
                
                // Save to conversations in Discover, Imagine, and Labs modes
                // Only Library mode doesn't save to sidebar
                const shouldSaveToConversation = currentSection !== 'library';
                
                if (shouldSaveToConversation) {
                    // Create conversation if doesn't exist (Discover, Imagine, Labs modes)
                    if (!currentConversationId) {
                        // Try to create conversation if user is authenticated, otherwise chat without saving
                        if (currentUser && localStorage.getItem('authToken')) {
                            try {
                                // Create conversation with a title based on first message (truncated)
                                let initialTitle = message.slice(0, 50);
                                if (message.length > 50) initialTitle += '...';
                                
                                const convResult = await API.Conversations.create(initialTitle);
                                currentConversationId = convResult.conversation._id || convResult.conversation.id;
                                console.log(`✅ Created new conversation for ${currentSection}:`, currentConversationId);
                            } catch (error) {
                                console.log('ℹ️ Could not save conversation - continuing without saving');
                            }
                        } else {
                            console.log('ℹ️ User not signed in - chat will not be saved to sidebar (but AI still responds)');
                        }
                    }

                    // Send message and get AI response if we have a conversation ID
                    if (currentConversationId) {
                        try {
                            const result = await API.Messages.send(
                                currentConversationId,
                                fullMessage,
                                currentQuickResponse || 'balanced',
                                currentAbortController.signal
                            );

                            // Add AI response to chat
                            if (result.success && result.aiMessage) {
                                const msgId = result.aiMessage._id || result.aiMessage.id;
                                // Check for search results in metadata
                                const searchResults = result.aiMessage.metadata?.searchResults || null;
                                const imageResults = result.aiMessage.metadata?.imageResults || null;
                                console.log('📦 AI Response Metadata:', result.aiMessage.metadata);
                                console.log('🖼️ Image Results from metadata:', imageResults);
                                addMessage(result.aiMessage.content, 'assistant', msgId, searchResults, imageResults);
                                try { saveMessage('ai', result.aiMessage.content); } catch (e) {}
                                console.log('✅ Received AI response and saved to conversation');
                                if (searchResults) {
                                    console.log(`🔍 Displayed ${searchResults.length} search results`);
                                }
                                if (imageResults) {
                                    console.log(`🖼️ Displayed ${imageResults.length} images`);
                                }
                                
                                // Auto-generate smart title on 2nd message based on user + AI response
                                if (result.conversation && result.conversation.title) {
                                    // Check if title was auto-generated by backend (improved from initial message preview)
                                    const isImprovedTitle = result.conversation.title !== message.slice(0, 50) && 
                                                           result.conversation.title !== (message.slice(0, 50) + '...');
                                    if (isImprovedTitle) {
                                        updateConversationTitleInUI(currentConversationId, result.conversation.title);
                                        console.log('📝 Smart title generated:', result.conversation.title);
                                    }
                                }
                                
                                // Reload conversation history to show in sidebar with updated title
                                if (currentUser && currentUser.userId) {
                                    setTimeout(() => loadUserChatHistory(), 300);
                                }
                            } else {
                                console.error('❌ Unexpected response format:', result);
                                throw new Error('Failed to save message - invalid response format');
                            }
                        } catch (error) {
                            console.error('❌ Error sending message to backend:', error.message);
                            console.error('Stack:', error.stack);
                            throw error; // Re-throw to be caught by outer try-catch
                        }
                    } else {
                        // No conversation ID - get AI response without saving
                        console.log(`💬 Chat without saving to sidebar`);
                        
                        // Get conversation history from current session only (not backend)
                        const sessionHistory = messages.map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.text
                        }));
                        
                        // Call backend to get AI response only
                        const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': localStorage.getItem('authToken') ? `Bearer ${localStorage.getItem('authToken')}` : ''
                            },
                            body: JSON.stringify({
                                message: fullMessage,
                                history: sessionHistory,
                                responseType: currentQuickResponse || 'balanced'
                            }),
                            signal: currentAbortController.signal
                        });
                        
                        if (!response.ok) {
                            throw new Error('Failed to get AI response');
                        }
                        
                        const result = await response.json();
                        if (result.success && result.content) {
                            const searchResults = result.metadata?.searchResults || null;
                            const imageResults = result.metadata?.imageResults || null;
                            addMessage(result.content, 'assistant', null, searchResults, imageResults);
                            try { saveMessage('ai', result.content); } catch (e) {}
                            console.log('✅ Received AI response');
                            if (searchResults) {
                                console.log(`🔍 Displayed ${searchResults.length} search results`);
                            }
                        } else {
                            throw new Error(result.error || 'Invalid response');
                        }
                    }
                } else {
                    // Library mode: just get AI response without saving to conversations
                    console.log(`💬 Chat in Library mode - showing response only (not saved to sidebar)`);
                    
                    // Get conversation history from current session only (not backend)
                    const sessionHistory = messages.map(msg => ({
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        content: msg.text
                    }));
                    
                    // Call backend to get AI response only
                    const response = await fetch(`${API_BASE_URL}/api/ai/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': localStorage.getItem('authToken') ? `Bearer ${localStorage.getItem('authToken')}` : ''
                        },
                        body: JSON.stringify({
                            message: fullMessage,
                            history: sessionHistory,
                            responseType: currentQuickResponse || 'balanced',
                            emojiUsage: userSettings.emojiUsage || 'default'
                        }),
                        signal: currentAbortController.signal
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to get AI response');
                    }
                    
                    const result = await response.json();
                    if (result.success && result.content) {
                        const searchResults = result.metadata?.searchResults || null;
                        const imageResults = result.metadata?.imageResults || null;
                        addMessage(result.content, 'assistant', null, searchResults, imageResults);
                        try { saveMessage('ai', result.content); } catch (e) {}
                        console.log('✅ Received AI response (Library session-only)');
                        if (searchResults) {
                            console.log(`🔍 Displayed ${searchResults.length} search results`);
                        }
                    } else {
                        throw new Error(result.error || 'Invalid response');
                    }
                }
            } catch (error) {
                // Check if error is due to abort
                if (error.name === 'AbortError') {
                    console.log('🛑 Request cancelled by user');
                    addMessage('⚠️ Response generation stopped by user.', 'assistant');
                } else {
                    console.error('❌ Backend error - reverting to offline mode:', error.message);
                    console.error('Details:', error);
                    addMessage(`⚠️ Unable to save message to server. ${error.message}. Showing response offline.`, 'assistant');
                    // Fallback to mock response
                    sendMockMessage(message);
                }
            } finally {
                // Reset state and hide stop button
                isGenerating = false;
                currentAbortController = null;
                hideStopButton();
            }
        }

        // Helper function to update conversation title in UI
        function updateConversationTitleInUI(conversationId, newTitle) {
            const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
            if (conversationItem) {
                const titleSpan = conversationItem.querySelector('span');
                if (titleSpan) {
                    titleSpan.textContent = newTitle;
                }
            }
        }

        // Fallback mock message function
        function sendMockMessage(message) {
            // Use the lightweight local generator which can reference conversation memory.
            setTimeout(() => {
                try {
                    // Check if generation was stopped
                    if (!isGenerating) {
                        console.log('Mock message cancelled');
                        hideStopButton();
                        return;
                    }
                    
                    const reply = generateReply(message);
                    // Save AI reply to conversation memory and show in UI
                    try { saveMessage('ai', reply); } catch (e) {}
                    showMessage('ai', reply);
                } catch (err) {
                    console.error('Mock reply generation error:', err);
                    addMessage('Sorry, I could not generate a reply right now.', 'assistant');
                } finally {
                    isGenerating = false;
                    hideStopButton();
                }
            }, 300);
        }

        // Generate image function
        async function generateImage(prompt) {
            // Require authentication
            if (!requireAuth('image generation')) {
                return;
            }

            try {
                console.log('🎨 Starting image generation with prompt:', prompt);

                // Add loading message
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message assistant';
                messageDiv.id = 'imageLoadingMessage';
                
                const avatar = document.createElement('div');
                avatar.className = 'message-avatar';
                avatar.innerHTML = `
                    <div class="assistant-infinity">
                        <div class="assistant-infinity-icon"></div>
                    </div>
                `;
                
                const bubble = document.createElement('div');
                bubble.className = 'message-bubble';
                bubble.innerHTML = `
                    <div class="image-generation-loading">
                        <div class="spinner"></div>
                        <p>🎨 Generating image: "${prompt}"</p>
                        <p style="font-size: 0.85em; color: var(--text-secondary);">This may take a moment...</p>
                    </div>
                `;
                
                const contentWrapper = document.createElement('div');
                contentWrapper.style.display = 'flex';
                contentWrapper.style.flexDirection = 'column';
                contentWrapper.appendChild(bubble);
                
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(contentWrapper);
                
                const messagesContainer = document.getElementById('messagesContainer');
                messagesContainer.appendChild(messageDiv);
                
                // Auto scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // Get auth token
                const token = localStorage.getItem('authToken');
                
                // Call backend to generate image
                const response = await fetch(`${API_BASE_URL}/api/ai/generate-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                    body: JSON.stringify({ prompt })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Image generation failed');
                }

                const result = await response.json();
                console.log('✅ Image generated successfully:', result);

                // Remove loading message
                const loadingMsg = document.getElementById('imageLoadingMessage');
                if (loadingMsg) {
                    loadingMsg.remove();
                }

                // Use the user-scoped image URL from the response
                // Format: /uploads/images/user-{userId}/{filename}
                const absoluteImageUrl = result.imageUrl.startsWith('http') 
                    ? result.imageUrl 
                    : `http://localhost:3000${result.imageUrl}`;

                // Display generated image
                const imageDiv = document.createElement('div');
                imageDiv.className = 'message assistant';
                
                const imageAvatar = document.createElement('div');
                imageAvatar.className = 'message-avatar';
                imageAvatar.innerHTML = `
                    <div class="assistant-infinity">
                        <div class="assistant-infinity-icon"></div>
                    </div>
                `;
                
                const imageBubble = document.createElement('div');
                imageBubble.className = 'message-bubble image-bubble';
                imageBubble.innerHTML = `
                    <div class="generated-image-container">
                        <img src="${absoluteImageUrl}" alt="${prompt}" style="max-width: 100%; border-radius: 8px; margin-bottom: 8px;">
                        <div class="image-details">
                            <p style="font-size: 0.9em; margin: 8px 0; word-break: break-word;"><strong>Prompt:</strong> ${prompt}</p>
                        </div>
                        <div class="image-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                            <button onclick="copyImageUrl('${absoluteImageUrl}', event)" class="message-action-btn" title="Copy URL">
                                <i class="fas fa-copy"></i> Copy URL
                            </button>
                            <button onclick="downloadImage('${absoluteImageUrl}', '${result.filename}')" class="message-action-btn" title="Download">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <button onclick="saveImageToLibrary('${absoluteImageUrl}', '${prompt.replace(/'/g, "\\'")}')" class="message-action-btn" title="Save to Library">
                                <i class="fas fa-heart"></i> Save
                            </button>
                        </div>
                    </div>
                `;
                
                const imageContentWrapper = document.createElement('div');
                imageContentWrapper.style.display = 'flex';
                imageContentWrapper.style.flexDirection = 'column';
                imageContentWrapper.appendChild(imageBubble);
                
                imageDiv.appendChild(imageAvatar);
                imageDiv.appendChild(imageContentWrapper);
                
                messagesContainer.appendChild(imageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                // Image is automatically saved to user's directory on backend
                // No need to save to localStorage - backend handles persistence per user
                console.log('✅ Image generated and saved on backend for user:', result.userId);

            } catch (error) {
                console.error('❌ Image generation error:', error);
                
                // Remove loading message
                const loadingMsg = document.getElementById('imageLoadingMessage');
                if (loadingMsg) {
                    loadingMsg.remove();
                }
                
                // Show error message
                addMessage(`❌ Image generation failed: ${error.message}\n\nPlease make sure:\n1. You are authenticated\n2. Your Hugging Face API key is configured\n3. The backend server is running`, 'assistant');
            }
        }

        // Copy image URL to clipboard
        function copyImageUrl(url, event) {
            navigator.clipboard.writeText(url).then(() => {
                const btn = event ? event.target.closest('button') : null;
                if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                    }, 2000);
                }
                showNotification('URL copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy:', err);
                showNotification('Failed to copy URL', 'error');
            });
        }
        window.generateImage = generateImage;
        window.copyImageUrl = copyImageUrl;

        // Download image
        function downloadImage(url, filename) {
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'generated-image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        window.downloadImage = downloadImage;

        // Save image to library
        function saveImageToLibrary(url, prompt) {
            // Image is already saved on backend when generated
            // This function just shows a confirmation to the user
            console.log('📚 Image is already saved in your library on the backend');
            
            // Show confirmation
            const btn = event.target.closest('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }
        window.saveImageToLibrary = saveImageToLibrary;

        // Convert plain text to formatted HTML with proper structure
        function formatTextToHtml(text) {
            if (!text) return '';
            
            let html = text
                // Escape HTML special characters first
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            // Convert **bold** to <strong>
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            
            // Convert __bold__ to <strong>
            html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
            
            // Convert *italic* to <em>
            html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
            
            // Convert _italic_ to <em>
            html = html.replace(/_(.+?)_/g, '<em>$1</em>');
            
            // Convert `code` to <code>
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Convert # Heading 1 to <h1>
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
            
            // Convert ## Heading 2 to <h2>
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            
            // Convert ### Heading 3 to <h3>
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            
            // Convert #### Heading 4 to <h4>
            html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
            
            // Handle numbered lists (1. item)
            html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
            html = html.replace(/(<li>.+<\/li>)/s, '<ol>$1</ol>');
            
            // Handle bulleted lists (- item or * item)
            html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
            const ulMatches = html.match(/(?<!<ol>)((?:<li>[^<]*<\/li>\s*)+)(?!<\/ol>)/g);
            if (ulMatches) {
                ulMatches.forEach(match => {
                    if (!match.includes('<ol>')) {
                        html = html.replace(match, '<ul>' + match + '</ul>');
                    }
                });
            }
            
            // Convert line breaks to <br> or <p> tags
            html = html.replace(/\n\n+/g, '</p><p>');
            html = '<p>' + html + '</p>';
            
            // Clean up empty paragraphs
            html = html.replace(/<p><\/p>/g, '');
            html = html.replace(/<p>(<[hou][1-4lr]>)/g, '$1');
            html = html.replace(/(<\/[hou][1-4lr]>)<\/p>/g, '$1');
            
            // Wrap in content div for styling
            return `<div class="message-content">${html}</div>`;
        }

        // ==================== EMOJI UTILITY FUNCTIONS ====================
        
        // Emoji sets for different contexts
        const emojiSets = {
            positive: ['😊', '👍', '✨', '🎉', '💡', '🚀', '⭐', '💪', '🌟', '🎯'],
            negative: ['😔', '❌', '⚠️', '🤔', '💭', '🔍', '📌', '⚡'],
            tech: ['💻', '🔧', '⚙️', '🖥️', '📱', '🌐', '🔌', '💾', '🖱️', '⌨️'],
            creative: ['🎨', '✏️', '📝', '🖊️', '🎭', '🎪', '🎬', '📚', '🔖'],
            learning: ['📖', '🎓', '🧠', '💭', '🔬', '🔭', '📊', '📈', '💡'],
            communication: ['💬', '🗨️', '💌', '📢', '📣', '🔔', '📧', '📞'],
            time: ['⏰', '⌛', '⏳', '🕐', '📅', '🗓️'],
            nature: ['🌱', '🌿', '🌳', '🌺', '🌸', '🌼', '🌻', '🍀'],
            punctuation: ['❓', '❗', '‼️', '⁉️', '💯', '✅', '☑️']
        };

        function addEmojisToText(text, emojiLevel = 'default') {
            if (!text || emojiLevel === 'less') return text;
            
            // Analyze if this message needs emojis based on content and tone
            if (!shouldUseEmojis(text, emojiLevel)) {
                return text;
            }
            
            const intensity = emojiLevel === 'more' ? 2 : 1;
            
            // Split text into sentences
            let sentences = text.split(/([.!?]\s+)/);
            let result = '';
            let emojisAdded = 0;
            const maxEmojis = emojiLevel === 'more' ? 5 : 3;
            
            for (let i = 0; i < sentences.length; i++) {
                let sentence = sentences[i];
                
                // Skip punctuation parts
                if (sentence.match(/^[.!?]\s+$/)) {
                    result += sentence;
                    continue;
                }
                
                // Add emoji selectively based on content, intensity, and limit
                if (emojisAdded < maxEmojis && sentence.length > 20 && shouldAddEmojiToSentence(sentence, intensity)) {
                    const enhanced = addContextualEmoji(sentence, intensity);
                    if (enhanced !== sentence) {
                        emojisAdded++;
                        sentence = enhanced;
                    }
                }
                
                result += sentence;
            }
            
            return result;
        }

        function shouldUseEmojis(text, emojiLevel) {
            const lowerText = text.toLowerCase();
            
            // Don't use emojis for very technical/code-heavy content
            if (text.includes('```') || text.includes('function') || text.includes('const ') || text.includes('class ')) {
                return false;
            }
            
            // Don't use emojis for error messages or warnings
            if (lowerText.includes('error:') || lowerText.includes('warning:') || lowerText.includes('failed')) {
                return false;
            }
            
            // Always use for 'more' mode unless it's pure code
            if (emojiLevel === 'more') {
                return true;
            }
            
            // For 'default' mode, use emojis only for conversational, helpful, or positive content
            const conversationalIndicators = [
                'great', 'awesome', 'help', 'glad', 'happy', 'welcome',
                'sure', 'absolutely', 'perfect', 'excellent', 'wonderful',
                'question', 'how', 'what', 'why', 'learn', 'understand',
                'create', 'build', 'improve', 'thanks', 'thank you'
            ];
            
            return conversationalIndicators.some(word => lowerText.includes(word));
        }

        function shouldAddEmojiToSentence(sentence, intensity) {
            // For intensity 2 (more mode), add to more sentences
            if (intensity === 2) {
                return sentence.length > 15;
            }
            
            // For default mode, be selective
            const lowerSentence = sentence.toLowerCase();
            
            // Add to questions
            if (sentence.includes('?')) return true;
            
            // Add to enthusiastic statements
            if (sentence.includes('!')) return true;
            
            // Add to helpful/positive statements
            const positiveWords = ['great', 'help', 'sure', 'yes', 'perfect', 'excellent', 'glad'];
            if (positiveWords.some(word => lowerSentence.includes(word))) return true;
            
            // Otherwise, only 30% chance to add emoji
            return Math.random() < 0.3;
        }

        function addContextualEmoji(sentence, intensity = 1) {
            const lowerSentence = sentence.toLowerCase();
            let emoji = '';
            
            // Determine context and select appropriate emoji (order matters - most specific first)
            if (lowerSentence.match(/\b(great|excellent|perfect|amazing|wonderful|fantastic)\b/)) {
                emoji = getRandomEmoji(emojiSets.positive);
            } else if (lowerSentence.match(/\b(code|programming|software|development|computer|tech|function|variable)\b/)) {
                emoji = getRandomEmoji(emojiSets.tech);
            } else if (lowerSentence.match(/\b(learn|study|understand|knowledge|education|tutorial)\b/)) {
                emoji = getRandomEmoji(emojiSets.learning);
            } else if (lowerSentence.match(/\b(create|design|art|write|creative|build)\b/)) {
                emoji = getRandomEmoji(emojiSets.creative);
            } else if (lowerSentence.match(/\b(help|assist|support|guide|show|explain)\b/)) {
                emoji = getRandomEmoji(emojiSets.communication);
            } else if (lowerSentence.match(/\b(time|when|schedule|date|deadline)\b/)) {
                emoji = getRandomEmoji(emojiSets.time);
            } else if (lowerSentence.match(/\b(grow|develop|progress|improve|enhance)\b/)) {
                emoji = getRandomEmoji(emojiSets.nature);
            } else if (lowerSentence.match(/\?$/)) {
                emoji = '🤔';
            } else if (lowerSentence.match(/!$/)) {
                emoji = getRandomEmoji(emojiSets.positive);
            } else {
                // No emoji needed for this sentence
                return sentence;
            }
            
            // Add emoji at the end only (cleaner look)
            if (emoji) {
                // For 'more' mode, occasionally add at both ends for emphasis
                if (intensity === 2 && Math.random() < 0.3) {
                    return `${emoji} ${sentence} ${emoji}`;
                } else {
                    return `${sentence} ${emoji}`;
                }
            }
            
            return sentence;
        }

        function getRandomEmoji(emojiArray) {
            return emojiArray[Math.floor(Math.random() * emojiArray.length)];
        }

        // Helper function to create search results UI
        function createSearchResultsHTML(searchResults) {
            if (!searchResults || searchResults.length === 0) return '';
            
            let html = '<div class="search-results-container" style="margin-top: 12px; padding: 12px; background: var(--search-result-bg, rgba(46, 160, 67, 0.05)); border-left: 3px solid var(--primary-color, #2ea043); border-radius: 6px;">';
            html += '<div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;"><i class="fas fa-globe" style="color: var(--primary-color);"></i> Web Search Results</div>';
            
            searchResults.slice(0, 5).forEach((result, index) => {
                const domain = extractDomain(result.link);
                html += `
                    <div class="search-result-item" style="margin-bottom: 10px; padding-bottom: 10px; ${index < searchResults.length - 1 ? 'border-bottom: 1px solid var(--border-color, #e1e4e8);' : ''}">
                        <div style="font-size: 14px; font-weight: 500; margin-bottom: 2px;">
                            <a href="${escapeHtml(result.link)}" target="_blank" rel="noopener noreferrer" style="color: var(--link-color, #0969da); text-decoration: none; display: flex; align-items: center; gap: 4px;">
                                ${escapeHtml(result.title)}
                                <i class="fas fa-external-link-alt" style="font-size: 10px; opacity: 0.7;"></i>
                            </a>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary, #586069); margin-bottom: 4px;">${domain}</div>
                        ${result.snippet ? `<div style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">${escapeHtml(result.snippet)}</div>` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
            return html;
        }

        // Helper function to create image results UI
        function createImageResultsHTML(imageResults) {
            if (!imageResults || imageResults.length === 0) return '';
            
            let html = '<div class="image-results-container" style="margin-top: 12px; padding: 12px; background: var(--search-result-bg, rgba(46, 160, 67, 0.05)); border-left: 3px solid var(--primary-color, #2ea043); border-radius: 6px;">';
            html += '<div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;"><i class="fas fa-images" style="color: var(--primary-color);"></i> Image Results</div>';
            
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">';
            
            imageResults.slice(0, 6).forEach((image) => {
                const imageUrl = image.thumbnail || image.url;
                const source = image.source || 'Source';
                html += `
                    <div class="image-result-item" style="position: relative; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s; border: 1px solid var(--border-color, #e1e4e8);" onclick="window.open('${escapeHtml(image.url)}', '_blank')">
                        <img src="${escapeHtml(imageUrl)}" 
                             alt="${escapeHtml(image.title)}" 
                             style="width: 100%; height: 150px; object-fit: cover; display: block;"
                             onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding: 20px; text-align: center; color: var(--text-secondary);\\'>Image unavailable</div>';"
                        />
                        <div style="padding: 6px; background: rgba(0, 0, 0, 0.7); color: white; font-size: 11px; position: absolute; bottom: 0; left: 0; right: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(image.title || source)}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            html += '</div>';
            return html;
        }

        // Helper function to extract domain from URL
        function extractDomain(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname.replace('www.', '');
            } catch (e) {
                return 'unknown';
            }
        }

        // Helper function to escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        function addMessage(text, sender, messageId = null, searchResults = null, imageResults = null) {
            const messagesContainer = document.getElementById('messagesContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}`;
            
            // Store message ID for backend operations
            if (messageId) {
                messageDiv.dataset.messageId = messageId;
            }
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            
            if (sender === 'user') {
                avatar.innerHTML = '<i class="fas fa-user"></i>';
            } else {
                // Use infinity logo for assistant
                avatar.innerHTML = `
                    <div class="assistant-infinity">
                        <div class="assistant-infinity-icon"></div>
                    </div>
                `;
            }
            
            const contentWrapper = document.createElement('div');
            contentWrapper.style.display = 'flex';
            contentWrapper.style.flexDirection = 'column';
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            // For assistant messages, use formatted HTML; for user messages, use plain text
            if (sender === 'assistant') {
                // Apply emoji enhancement based on user settings
                let processedText = text;
                if (userSettings.emojiUsage && userSettings.emojiUsage !== 'less') {
                    processedText = addEmojisToText(text, userSettings.emojiUsage);
                }
                bubble.innerHTML = formatTextToHtml(processedText);
                
                // Add image results if available (show first for visual impact)
                if (imageResults && imageResults.length > 0) {
                    console.log('🖼️ Adding images to message bubble:', imageResults);
                    const imageHTML = createImageResultsHTML(imageResults);
                    console.log('🖼️ Generated image HTML length:', imageHTML.length);
                    bubble.innerHTML += imageHTML;
                } else {
                    console.log('⚠️ No image results to display:', imageResults);
                }
                
                // Add search results if available
                if (searchResults && searchResults.length > 0) {
                    bubble.innerHTML += createSearchResultsHTML(searchResults);
                }
            } else {
                bubble.style.whiteSpace = 'pre-wrap'; // Preserve line breaks
                bubble.textContent = text;
            }
            
            contentWrapper.appendChild(bubble);
            
            // Add action buttons
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            
            if (sender === 'assistant') {
                // Assistant message actions
                actions.innerHTML = `
                    <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="message-action-btn" onclick="likeMessage(this)" title="Like">
                        <i class="fas fa-thumbs-up"></i>
                    </button>
                    <button class="message-action-btn" onclick="dislikeMessage(this)" title="Dislike">
                        <i class="fas fa-thumbs-down"></i>
                    </button>
                    <button class="message-action-btn" onclick="shareMessage(this)" title="Share">
                        <i class="fas fa-share"></i>
                    </button>
                    <button class="message-action-btn" onclick="refreshMessage(this)" title="Regenerate">
                        <i class="fas fa-rotate"></i>
                    </button>
                    <button class="message-action-btn" onclick="moreMessageActions(this)" title="More">
                        <i class="fas fa-ellipsis"></i>
                    </button>
                `;
            } else {
                // User message actions - Copy, Report, Edit
                actions.innerHTML = `
                    <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="message-action-btn" onclick="reportMessage(this)" title="Report">
                        <i class="fas fa-flag"></i>
                    </button>
                    <button class="message-action-btn" onclick="editMessage(this)" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                `;
            }
            
            contentWrapper.appendChild(actions);
            
            if (sender === 'user') {
                messageDiv.appendChild(contentWrapper);
                messageDiv.appendChild(avatar);
            } else {
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(contentWrapper);
            }
            
            messagesContainer.appendChild(messageDiv);
            
            // Enhanced scroll for mobile devices
            setTimeout(() => {
                scrollToBottom();
            }, 50);
            
            messages.push({ text, sender, timestamp: new Date() });
            updateCarouselVisibility();
            
            // Return the bubble element for dynamic updates
            return bubble;
        }

        // Action Buttons
        function setupActionButtons() {
            const actionGrid = document.getElementById('actionGrid');
            actionGrid.style.opacity = '1';
            actionGrid.style.pointerEvents = 'auto';
        }

        function selectAction(action) {
            if (action === 'video') {
                showVideoModal();
                return;
            }

            // Require authentication for image generation
            if (action === 'image' || action === 'logo') {
                if (!requireAuth('image generation')) {
                    return;
                }
            }

            const actions = {
                'image': 'Create an image of...',
                'product': 'Recommend a product for...',
                'writing': 'Help me improve this writing:',
                'logo': 'Design a logo for...',
                'topic': 'Explain this topic simply:',
                'draft': 'Write a first draft about...',
                'advice': 'I need advice about...',
                'email': 'Draft an email to...'
            };
            const input = document.getElementById('chatInput');
            input.value = actions[action];
            input.focus();
            updateCharCounter();
        }
        window.selectAction = selectAction;

        // Quick Response
        function toggleQuickResponse() {
            const dropdown = document.getElementById('quickResponseDropdown');
            dropdown.classList.toggle('show');
        }

        function selectQuickResponse(type) {
            currentQuickResponse = type;
            const btn = document.querySelector('.quick-response-btn span');
            if (btn) {
                const types = {
                    'concise': 'Concise',
                    'balanced': 'Balanced',
                    'detailed': 'Detailed',
                    'creative': 'Creative'
                };
                btn.textContent = types[type];
            }
            toggleQuickResponse();
        }
        window.selectQuickResponse = selectQuickResponse;

        // Sidebar Functions
        function setupSidebar() {
            // No additional event listeners needed - using onclick attributes
        }

        function toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('expanded');
        }
        window.toggleSidebar = toggleSidebar;

        // Mobile sidebar functions
        function toggleMobileSidebar() {
            const sidebar = document.getElementById('mainSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            if (sidebar && overlay) {
                const isOpen = sidebar.classList.contains('open');
                
                if (isOpen) {
                    closeMobileSidebar();
                } else {
                    openMobileSidebar();
                }
            }
        }
        window.toggleMobileSidebar = toggleMobileSidebar;

        function openMobileSidebar() {
            const sidebar = document.getElementById('mainSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            if (sidebar && overlay) {
                // Force expanded state on mobile - do this first
                sidebar.classList.add('expanded');
                
                // Small delay to ensure expanded class is applied before opening
                requestAnimationFrame(() => {
                    sidebar.classList.add('open');
                    overlay.classList.add('active');
                    
                    // Prevent body scroll when sidebar is open
                    document.body.classList.add('sidebar-open');
                    document.body.style.overflow = 'hidden';
                    
                    // Add smooth animation
                    sidebar.style.willChange = 'transform';
                    setTimeout(() => {
                        sidebar.style.willChange = 'auto';
                    }, 350);
                });
            }
        }
        window.openMobileSidebar = openMobileSidebar;

        function closeMobileSidebar() {
            const sidebar = document.getElementById('mainSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            if (sidebar && overlay) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                
                // Restore body scroll
                document.body.classList.remove('sidebar-open');
                document.body.style.overflow = '';
                
                // Keep expanded class on mobile - removed auto-collapse
                // Sidebar should always be expanded when opened on mobile
            }
        }
        window.closeMobileSidebar = closeMobileSidebar;

        // Enhanced mobile sidebar setup with swipe gestures
        function setupMobileSidebarEnhancements() {
            const sidebar = document.getElementById('mainSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            
            if (!sidebar || !overlay) return;

            // Swipe down to close (bottom sheet)
            let startY = 0;
            let currentY = 0;
            let isDragging = false;

            sidebar.addEventListener('touchstart', (e) => {
                // Only allow drag from top area (drag handle)
                if (e.touches[0].clientY < 100) {
                    startY = e.touches[0].clientY;
                    isDragging = true;
                    sidebar.style.transition = 'none';
                }
            }, { passive: true });

            sidebar.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;
                
                // Only allow downward dragging
                if (deltaY > 0) {
                    sidebar.style.transform = `translateY(${deltaY}px)`;
                }
            }, { passive: true });

            sidebar.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;
                
                const deltaY = currentY - startY;
                sidebar.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                
                // Close if dragged down more than 100px
                if (deltaY > 100) {
                    closeMobileSidebar();
                } else {
                    sidebar.style.transform = 'translateY(0)';
                }
            });

            // Haptic feedback on mobile (if supported)
            function triggerHaptic() {
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }

            // Add haptic feedback to buttons
            const mobileButtons = sidebar.querySelectorAll('.nav-item, .quick-action-btn');
            mobileButtons.forEach(btn => {
                btn.addEventListener('touchstart', triggerHaptic, { passive: true });
            });

            // Auto-close sidebar when selecting actions
            const quickActions = sidebar.querySelectorAll('.quick-action-btn');
            quickActions.forEach(btn => {
                btn.addEventListener('click', () => {
                    setTimeout(() => {
                        if (window.innerWidth <= 1024) {
                            closeMobileSidebar();
                        }
                    }, 300);
                });
            });
            
            // Close sidebar when clicking overlay
            overlay.addEventListener('click', closeMobileSidebar);
            
            // Close sidebar on navigation link clicks (mobile only)
            const navItems = sidebar.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        setTimeout(closeMobileSidebar, 100);
                    }
                });
            });
            
            // Close sidebar when window is resized to desktop
            let resizeTimer;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (window.innerWidth > 768) {
                        closeMobileSidebar();
                        document.body.style.overflow = '';
                    }
                }, 250);
            });
            
            // Prevent body scroll on touch devices when sidebar is open
            let touchStartY = 0;
            sidebar.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            
            sidebar.addEventListener('touchmove', (e) => {
                const scrollTop = sidebar.scrollTop;
                const scrollHeight = sidebar.scrollHeight;
                const height = sidebar.clientHeight;
                const touchY = e.touches[0].clientY;
                const touchYDelta = touchY - touchStartY;
                
                // Prevent overscroll bounce
                if ((scrollTop === 0 && touchYDelta > 0) || 
                    (scrollTop + height >= scrollHeight && touchYDelta < 0)) {
                    e.preventDefault();
                }
            }, { passive: false });

            // Add swipe-from-edge gesture to open sidebar
            let touchStartX = 0;
            let touchStartTime = 0;
            const swipeThreshold = 50; // Minimum distance for swipe
            const edgeThreshold = 30; // Distance from edge to trigger swipe
            const timeThreshold = 300; // Maximum time for swipe gesture

            document.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartTime = Date.now();
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                if (window.innerWidth > 768) return; // Only on mobile
                if (sidebar.classList.contains('open')) return; // Don't trigger if already open
                
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndTime = Date.now();
                const swipeDistance = touchEndX - touchStartX;
                const swipeTime = touchEndTime - touchStartTime;
                
                // Check if swipe started from left edge and moved right
                if (touchStartX <= edgeThreshold && 
                    swipeDistance >= swipeThreshold && 
                    swipeTime <= timeThreshold) {
                    openMobileSidebar();
                }
            }, { passive: true });
        }
        window.setupMobileSidebarEnhancements = setupMobileSidebarEnhancements;

        function goBack() {
            if (navigationHistory.length > 0) {
                const previousSection = navigationHistory.pop();
                navigateTo(previousSection, false);
            } else {
                // If no history, go to discover
                navigateTo('discover', false);
            }
        }

        function navigateTo(section, addToHistory = true) {
            // Close mobile sidebar when navigating (if on mobile)
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
            
            // Add current section to history before navigating
            if (addToHistory && currentSection !== section) {
                navigationHistory.push(currentSection);
            }
            currentSection = section;
            
            // Reset conversation ID for Library mode only
            // Discover, Imagine, and Labs modes will save chats to sidebar
            if (section === 'library') {
                currentConversationId = null;
                console.log('🔄 Reset conversation - Library mode (no save)');
            }
            
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const activeNav = document.querySelector(`.nav-item[onclick*="${section}"]`);
            if (activeNav) {
                activeNav.classList.add('active');
            }
            
            const greetings = {
                'discover': 'Discover amazing features and content',
                'imagine': 'Create and imagine with AI',
                'library': 'Explore your library',
                'labs': 'Try experimental features'
            };
            
            document.getElementById('greeting').textContent = greetings[section] || 'Hi there. What should we dive into today?';
            
            // Clear messages
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.innerHTML = '';
            messages = [];
            ocrResults = [];
            currentOcrContext = '';
            
            // Show carousel
            const cs = document.getElementById('carouselSection');
            if (cs) { 
                cs.style.display = ''; 
            }
            
            // Show action grid
            const ag = document.getElementById('actionGrid');
            if (ag) { 
                ag.style.opacity = '1'; 
                ag.style.pointerEvents = 'auto'; 
            }
            
            // Special handling for library section
            if (section === 'library') {
                // Reload user's images from backend before displaying
                loadLibraryFromStorage().then(() => {
                    displayLibrary();
                }).catch(error => {
                    console.error('Error loading library:', error);
                    displayLibrary(); // Display anyway with cached data
                });
                return;
            }
            
            const sectionMessages = {
                'discover': 'Welcome to Discover! Here you can explore new ideas and content.',
                'imagine': 'Welcome to Imagine! Create amazing visual content with AI.',
                'library': 'Welcome to your Library! Your saved conversations and content are here.',
                'labs': 'Welcome to Labs! Try out cutting-edge experimental features.'
            };
            
            setTimeout(() => {
                addMessage(sectionMessages[section] || 'Welcome!', 'assistant');
            }, 100);
        }
        window.navigateTo = navigateTo;

        function loadConversation(index) {
            const conversations = [
                { messages: ['Create a logo for my fantasy football team', 'Sure! I can help design a professional logo for your team. What colors and style do you prefer?'] },
                { messages: ['What are best practices for web design?', 'Great question! Modern web design emphasizes responsive layouts, accessibility, fast loading times, and user-centered design.'] },
                { messages: ['Explain async/await in JavaScript', 'Async/await is a modern way to handle asynchronous operations in JavaScript, making your code cleaner and easier to read.'] },
                { messages: ['How can I analyze data with Python?', 'Python offers powerful libraries like pandas, numpy, and matplotlib for data analysis. Would you like to see some examples?'] },
                { messages: ['Compare React and Vue frameworks', 'Both React and Vue are excellent choices. React has a larger ecosystem while Vue has a gentler learning curve. What\'s your use case?'] },
                { messages: ['Show me CSS Grid layout examples', 'CSS Grid is perfect for creating complex layouts. Here are some common patterns you can use...'] },
                { messages: ['What are machine learning basics?', 'Machine learning involves training algorithms to learn from data. The main types are supervised, unsupervised, and reinforcement learning.'] },
                { messages: ['How do I integrate APIs?', 'API integration typically involves making HTTP requests using fetch or axios. Let me show you a practical example...'] }
            ];
            
            const conv = conversations[index];
            if (!conv) return;
            
            document.getElementById('messagesContainer').innerHTML = '';
            const cs = document.getElementById('carouselSection');
            if (cs) { cs.style.display = 'none'; }
            
            // Update active conversation
            document.querySelectorAll('.conversation-item').forEach((item, i) => {
                if (i === index) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            if (conv.messages[0]) addMessage(conv.messages[0], 'user');
            if (conv.messages[1]) {
                setTimeout(() => {
                    addMessage(conv.messages[1], 'assistant');
                }, 300);
            }
        }

        // ==================== AUTHENTICATION FUNCTIONS ====================
        let currentUser = null;

        // Stop generation function
        function stopGeneration() {
            if (currentAbortController && isGenerating) {
                console.log('🛑 Stopping AI generation...');
                currentAbortController.abort();
                isGenerating = false;
                hideStopButton();
            }
        }
        window.stopGeneration = stopGeneration;

        // Show stop button (replaces send button)
        function showStopButton() {
            const sendBtn = document.querySelector('.send-btn');
            if (!sendBtn) return;
            
            // Hide send button
            sendBtn.style.display = 'none';
            
            // Check if stop button already exists
            let stopBtn = document.getElementById('stopGenerationBtn');
            if (!stopBtn) {
                stopBtn = document.createElement('button');
                stopBtn.id = 'stopGenerationBtn';
                stopBtn.className = 'input-action stop-btn';
                stopBtn.onclick = stopGeneration;
                stopBtn.innerHTML = '<i class="fas fa-stop"></i>';
                stopBtn.title = 'Stop generating';
                stopBtn.style.cssText = `
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    transition: all 0.3s ease;
                `;
                
                // Insert stop button in place of send button
                sendBtn.parentNode.insertBefore(stopBtn, sendBtn);
            }
            stopBtn.style.display = 'flex';
        }

        // Hide stop button (show send button back)
        function hideStopButton() {
            const stopBtn = document.getElementById('stopGenerationBtn');
            const sendBtn = document.querySelector('.send-btn');
            
            if (stopBtn) {
                stopBtn.style.display = 'none';
            }
            if (sendBtn) {
                sendBtn.style.display = 'flex';
            }
        }

        // API Client Object
        const API = {
            // Helper to get headers with user-id
            getHeaders() {
                const headers = { 'Content-Type': 'application/json' };
                
                // Add authentication token if available
                const token = localStorage.getItem('authToken');
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                // Add user ID if user is authenticated
                if (currentUser && currentUser.userId) {
                    headers['user-id'] = currentUser.userId;
                }
                
                return headers;
            },
            
            Conversations: {
                async create(title) {
                    const response = await fetch(`${API_BASE_URL}/api/conversations`, {
                        method: 'POST',
                        headers: API.getHeaders(),
                        body: JSON.stringify({ title })
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to create conversation`);
                    }
                    return data;
                },
                async getAll() {
                    const headers = API.getHeaders();
                    console.log('🔌 API.Conversations.getAll()');
                    console.log('   URL:', `${API_BASE_URL}/api/conversations`);
                    console.log('   Headers:', headers);
                    const response = await fetch(`${API_BASE_URL}/api/conversations`, {
                        method: 'GET',
                        headers: headers
                    });
                    const data = await response.json();
                    console.log(`📡 Conversations GET response: HTTP ${response.status}`);
                    console.log('   Data:', data);
                    if (!response.ok) {
                        console.error('❌ API Error: HTTP', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to get conversations`);
                    }
                    return data;
                },
                async getById(conversationId) {
                    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
                        method: 'GET',
                        headers: API.getHeaders()
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to get conversation`);
                    }
                    return data;
                },
                async update(conversationId, updates) {
                    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
                        method: 'PUT',
                        headers: API.getHeaders(),
                        body: JSON.stringify(updates)
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to update conversation`);
                    }
                    return data;
                },
                async delete(conversationId) {
                    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
                        method: 'DELETE',
                        headers: API.getHeaders()
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to delete conversation`);
                    }
                    return data;
                },
                async deleteAll() {
                    const response = await fetch(`${API_BASE_URL}/api/conversations/clear/all`, {
                        method: 'DELETE',
                        headers: API.getHeaders()
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to delete all conversations`);
                    }
                    return data;
                },
                async generateTitle(conversationId) {
                    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/generate-title`, {
                        method: 'POST',
                        headers: API.getHeaders()
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to generate title`);
                    }
                    return data;
                }
            },
            Messages: {
                async send(conversationId, content, responseType = 'balanced', signal = null) {
                    const emojiUsage = userSettings.emojiUsage || 'default';
                    const fetchOptions = {
                        method: 'POST',
                        headers: API.getHeaders(),
                        body: JSON.stringify({ conversationId, content, responseType, emojiUsage })
                    };
                    if (signal) {
                        fetchOptions.signal = signal;
                    }
                    const response = await fetch(`${API_BASE_URL}/api/messages`, fetchOptions);
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to send message`);
                    }
                    return data;
                },
                async regenerate(messageId, responseType = 'balanced') {
                    const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/regenerate`, {
                        method: 'POST',
                        headers: API.getHeaders(),
                        body: JSON.stringify({ responseType })
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        console.error('❌ API Error:', response.status, data);
                        throw new Error(data.error || `HTTP ${response.status}: Failed to regenerate message`);
                    }
                    return data;
                },
                async addReaction(messageId, reaction) {
                    const response = await fetch(`${API_BASE_URL}/api/messages/${messageId}/reactions`, {
                        method: 'POST',
                        headers: API.getHeaders(),
                        body: JSON.stringify({ reaction })
                    });
                    return await response.json();
                }
            },
            User: {
                async loadAllData() {
                    const response = await fetch(`${API_BASE_URL}/user/data`, {
                        method: 'GET',
                        headers: API.getHeaders()
                    });
                    return await response.json();
                }
            }
        };

        // Load user chat history from backend
        async function loadUserChatHistory() {
            if (!currentUser || !currentUser.userId) {
                console.log('⚠️ Cannot load chat history: user not authenticated', { currentUser });
                return;
            }

            console.log('🔄 Loading chat history for user:', currentUser.userId);
            try {
                const result = await API.Conversations.getAll();
                console.log('📥 API response:', result);
                if (result.success && result.conversations) {
                    renderConversationsList(result.conversations);
                    console.log(`✅ Loaded ${result.conversations.length} conversations`);
                } else {
                    console.log('📋 No conversations found in response:', result);
                }
            } catch (error) {
                console.error('❌ Error loading chat history:', error.message, error);
            }
        }

        // Render conversations list with three-dots menus
        function renderConversationsList(conversations) {
            const conversationsList = document.getElementById('conversationsList');
            if (!conversationsList) {
                console.warn('⚠️ Conversations list element not found');
                return;
            }

            // Clear existing conversations
            conversationsList.innerHTML = '';

            // If no conversations, show empty state
            if (!conversations || conversations.length === 0) {
                console.log('📭 No conversations to display');
                conversationsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px; text-align: center; padding: 12px;">No conversations yet</p>';
                return;
            }

            // Sort conversations: pinned first, then by date
            conversations.sort((a, b) => {
                const aIsPinned = a.isPinned || false;
                const bIsPinned = b.isPinned || false;
                // If pin status is different, pinned conversations come first
                if (aIsPinned !== bIsPinned) {
                    return bIsPinned ? 1 : -1;
                }
                // If same pin status, sort by date (newest first)
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });

            // Render each conversation
            console.log(`📚 Rendering ${conversations.length} conversations`);
            conversations.forEach((conversation, index) => {
                try {
                    const conversationElement = createConversationElement(conversation);
                    conversationsList.appendChild(conversationElement);
                    console.log(`  ✅ Added conversation ${index + 1}: ${conversation.title}`);
                } catch (err) {
                    console.error(`  ❌ Error creating conversation element:`, err, conversation);
                }
            });
        }

        // Create individual conversation element with three-dots menu
        function createConversationElement(conversation) {
            const conversationDiv = document.createElement('div');
            conversationDiv.className = 'conversation-item';
            if (conversation.isPinned) {
                conversationDiv.classList.add('pinned');
            }
            conversationDiv.dataset.conversationId = conversation.id || conversation._id;
            conversationDiv.onclick = () => loadConversationById(conversation.id || conversation._id);

            // Create content wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'conversation-item-content';
            
            // Message icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-message';
            
            // Conversation title
            const titleSpan = document.createElement('span');
            titleSpan.textContent = conversation.title || 'New Chat';
            
            contentWrapper.appendChild(icon);
            contentWrapper.appendChild(titleSpan);
            
            // Add pin icon if conversation is pinned
            if (conversation.isPinned) {
                const pinIcon = document.createElement('i');
                pinIcon.className = 'fas fa-thumbtack pin-indicator';
                pinIcon.title = 'Pinned';
                contentWrapper.appendChild(pinIcon);
            }

            // Three-dots menu button
            const menuButton = document.createElement('button');
            menuButton.className = 'conversation-menu-btn';
            menuButton.title = 'More options';
            menuButton.onclick = (event) => {
                event.stopPropagation();
                toggleConversationMenu(event, conversation.id || conversation._id);
            };
            
            const menuIcon = document.createElement('i');
            menuIcon.className = 'fas fa-ellipsis';
            menuButton.appendChild(menuIcon);

            conversationDiv.appendChild(contentWrapper);
            conversationDiv.appendChild(menuButton);

            return conversationDiv;
        }

        // Load conversation by ID
        async function loadConversationById(conversationId) {
            if (!conversationId || !isBackendConnected) {
                return;
            }

            try {
                // Update active state
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                });
                const activeItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
                if (activeItem) {
                    activeItem.classList.add('active');
                }

                // Load conversation data
                const result = await API.Conversations.getById(conversationId);
                if (result.success && result.conversation) {
                    currentConversationId = conversationId;
                    
                    // Clear messages and load conversation
                    const messagesContainer = document.getElementById('messagesContainer');
                    messagesContainer.innerHTML = '';
                    messages = [];
                    ocrResults = [];
                    currentOcrContext = '';
                    
                    // Hide carousel
                    const cs = document.getElementById('carouselSection');
                    if (cs) cs.style.display = 'none';

                    // Load messages if they exist
                    if (result.messages && result.messages.length > 0) {
                        result.messages.forEach(msg => {
                            // Extract search results and image results from metadata
                            const searchResults = msg.metadata?.searchResults || null;
                            const imageResults = msg.metadata?.imageResults || null;
                            
                            addMessage(msg.content, msg.role, msg._id || msg.id, searchResults, imageResults);
                        });
                    }

                    console.log(`✅ Loaded conversation: ${result.conversation.title}`);
                } else {
                    console.error('❌ Failed to load conversation');
                }
            } catch (error) {
                console.error('❌ Error loading conversation:', error);
            }
        }

        // Check for existing session on page load
        function checkAuth() {
            const token = localStorage.getItem('authToken');
            console.log('🔐 checkAuth() called - Token exists:', !!token);
            if (!token) {
                console.log('⚠️  No auth token found, skipping authentication check');
                return; // No token, skip verification
            }
            
            console.log('🔄 Verifying token with backend...');
            // Verify token with backend (non-blocking)
            fetch(`${API_BASE_URL}/api/auth/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('📡 Verify response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('📥 Verify response data:', data);
                if (data.success && data.valid && data.user) {
                    currentUser = {
                        ...data.user,
                        userId: data.user.id || data.user._id  // Map 'id' to 'userId' for API headers
                    };
                    console.log('✅ User authenticated:', currentUser);
                    updateUIForLoggedInUser();
                    // Refresh avatar with authenticated user data
                    initializeAvatar();
                } else {
                    console.log('❌ Token verification failed:', data.error);
                    localStorage.removeItem('authToken');
                }
            })
            .catch(error => {
                console.log('Auth check failed (backend not available):', error.message);
                // Don't remove token if backend is just offline
                // localStorage.removeItem('authToken');
            });
        }

        // Helper function to check if user is authenticated
        function requireAuth(featureName) {
            const token = localStorage.getItem('authToken');
            if (!token || !currentUser) {
                addMessage(`⚠️ Please sign in to use ${featureName}. Click the "Sign in" button in the sidebar.`, 'assistant');
                // Optionally show the sign-in modal
                setTimeout(() => showSignIn(), 500);
                return false;
            }
            return true;
        }

        function showSignIn() {
            const modal = document.getElementById('authModal');
            modal.classList.add('active');
            // Reset forms
            document.getElementById('signinForm').reset();
            document.getElementById('signupForm').reset();
            clearAuthMessages();
        }
        window.showSignIn = showSignIn;

        function closeAuthModal() {
            const modal = document.getElementById('authModal');
            modal.classList.remove('active');
            clearAuthMessages();
        }
        window.closeAuthModal = closeAuthModal;

        function switchAuthTab(tab) {
            const tabs = document.querySelectorAll('.auth-tab');
            const forms = document.querySelectorAll('.auth-form');
            
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            
            if (tab === 'signin') {
                tabs[0].classList.add('active');
                document.getElementById('signinForm').classList.add('active');
            } else {
                tabs[1].classList.add('active');
                document.getElementById('signupForm').classList.add('active');
            }
            
            clearAuthMessages();
        }

        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            const btn = input.parentElement.querySelector('.password-toggle-btn i');
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.classList.remove('fa-eye');
                btn.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                btn.classList.remove('fa-eye-slash');
                btn.classList.add('fa-eye');
            }
        }

        async function handleSignIn(event) {
            event.preventDefault();
            
            const email = document.getElementById('signinEmail').value.trim();
            const password = document.getElementById('signinPassword').value;
            const submitBtn = document.getElementById('signinBtn');
            
            // Client-side validation
            if (!email || !email.includes('@')) {
                showAuthError('signinError', 'Please enter a valid email address.');
                return;
            }
            
            if (!password) {
                showAuthError('signinError', 'Please enter your password.');
                return;
            }
            
            clearAuthMessages();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        email: email.toLowerCase(), 
                        password: password 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userId', data.user.id || data.user._id);
                    currentUser = {
                        ...data.user,
                        userId: data.user.id || data.user._id  // Map 'id' to 'userId' for API headers
                    };
                    window.currentUser = currentUser;
                    
                    // Load user's profile picture from backend
                    if (data.user.profilePicture) {
                        localStorage.setItem(`userProfilePicture_${currentUser.userId}`, data.user.profilePicture);
                    } else {
                        localStorage.removeItem(`userProfilePicture_${currentUser.userId}`);
                    }
                    
                    showAuthSuccess('signinSuccess', 'Successfully signed in! Welcome back.');
                    
                    setTimeout(() => {
                        closeAuthModal();
                        updateUIForLoggedInUser();
                    }, 1500);
                } else {
                    // Handle specific error codes
                    let errorMessage = 'Sign in failed. Please try again.';
                    if (response.status === 401) {
                        errorMessage = 'Invalid email or password. Please check your credentials.';
                    } else if (response.status === 404) {
                        errorMessage = 'Account not found. Please sign up first.';
                    } else if (data.error) {
                        errorMessage = data.error;
                    } else if (data.message) {
                        errorMessage = data.message;
                    }
                    showAuthError('signinError', errorMessage);
                }
            } catch (error) {
                console.error('Sign in error:', error);
                showAuthError('signinError', 'Unable to connect to server. Please try again later.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        }

        async function handleSignUp(event) {
            event.preventDefault();
            
            const username = document.getElementById('signupUsername').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const submitBtn = document.getElementById('signupBtn');
            
            // Client-side validation
            if (!username || username.length < 3) {
                showAuthError('signupError', 'Username must be at least 3 characters long.');
                return;
            }
            
            if (!email || !email.includes('@')) {
                showAuthError('signupError', 'Please enter a valid email address.');
                return;
            }
            
            if (!password || password.length < 6) {
                showAuthError('signupError', 'Password must be at least 6 characters long.');
                return;
            }
            
            clearAuthMessages();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        username: username,
                        email: email.toLowerCase(),
                        password: password 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userId', data.user.id || data.user._id);
                    currentUser = {
                        ...data.user,
                        userId: data.user.id || data.user._id  // Map 'id' to 'userId' for API headers
                    };
                    window.currentUser = currentUser;
                    
                    showAuthSuccess('signupSuccess', 'Account created successfully! Welcome aboard.');
                    
                    setTimeout(() => {
                        closeAuthModal();
                        updateUIForLoggedInUser();
                    }, 1500);
                } else {
                    // Handle specific error messages from backend
                    let errorMessage = 'Registration failed. Please try again.';
                    if (data.error) {
                        errorMessage = data.error;
                    } else if (data.message) {
                        errorMessage = data.message;
                    } else if (response.status === 400) {
                        errorMessage = 'Invalid input. Please check your details.';
                    } else if (response.status === 409) {
                        errorMessage = 'Email or username already exists.';
                    }
                    showAuthError('signupError', errorMessage);
                }
            } catch (error) {
                console.error('Sign up error:', error);
                showAuthError('signupError', 'Unable to connect to server. Please try again later.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        }

        function socialAuth(provider) {
            alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication would be implemented here.\n\nThis would redirect to ${provider}'s OAuth flow.`);
        }

        function updateUIForLoggedInUser() {
            const signInBtn = document.getElementById('signInBtn');
            
            if (signInBtn && currentUser) {
                signInBtn.innerHTML = `
                    <i class="fas fa-user-circle"></i>
                    <span>${currentUser.username || currentUser.email.split('@')[0]}</span>
                `;
                signInBtn.onclick = showUserMenu;
                
                // Update conversations note
                const note = document.querySelector('.conversations-note');
                if (note) {
                    note.textContent = 'Your conversations are being saved.';
                    note.style.color = 'var(--success)';
                }

                // Update sidebar profile with display name and email
                const userId = currentUser.userId || currentUser.id;
                const displayName = localStorage.getItem(`userDisplayName_${userId}`) || currentUser.displayName || currentUser.username || currentUser.email.split('@')[0];
                const email = currentUser.email || '';
                
                const sidebarAccount = document.getElementById('sidebarAccount');
                const sidebarDisplayName = document.getElementById('sidebarDisplayName');
                const sidebarEmail = document.getElementById('sidebarEmail');
                const userAvatar = document.getElementById('userAvatar');
                const quickAccessUsername = document.getElementById('quickAccessUsername');
                
                if (sidebarAccount) {
                    sidebarAccount.style.display = 'block';
                }
                
                if (sidebarDisplayName) {
                    sidebarDisplayName.textContent = displayName;
                }
                
                if (sidebarEmail) {
                    sidebarEmail.textContent = email;
                }
                
                if (quickAccessUsername) {
                    quickAccessUsername.textContent = displayName;
                }
                
                // Update avatar with profile picture or initials (userId already declared above)
                const profilePicture = userId ? localStorage.getItem(`userProfilePicture_${userId}`) : null;
                const initials = displayName.split(/[\s_]+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);
                
                if (userAvatar) {
                    if (profilePicture) {
                        userAvatar.style.backgroundImage = `url(${profilePicture})`;
                        userAvatar.style.backgroundSize = 'cover';
                        userAvatar.style.backgroundPosition = 'center';
                        userAvatar.textContent = '';
                    } else {
                        userAvatar.style.backgroundImage = '';
                        userAvatar.textContent = initials;
                    }
                }
                
                // Update button avatar as well
                const userAvatarBtn = document.getElementById('userAvatarBtn');
                if (userAvatarBtn) {
                    if (profilePicture) {
                        userAvatarBtn.style.backgroundImage = `url(${profilePicture})`;
                        userAvatarBtn.style.backgroundSize = 'cover';
                        userAvatarBtn.style.backgroundPosition = 'center';
                        userAvatarBtn.textContent = '';
                    } else {
                        userAvatarBtn.style.backgroundImage = '';
                        userAvatarBtn.textContent = initials;
                    }
                }
                
                // Hide sign in button
                if (signInBtn) {
                    signInBtn.style.display = 'none';
                }
                
                // Load user's chat history immediately
                console.log('👤 User logged in:', currentUser.username, 'ID:', currentUser.userId);
                loadUserChatHistory().catch(err => console.error('Failed to load chat history on login:', err));
            }
        }

        function showUserMenu() {
            const menu = `
                <div style="position: fixed; bottom: 80px; left: 20px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 8px; box-shadow: var(--shadow-md); z-index: 1000; min-width: 200px;">
                    <div style="padding: 8px 12px; border-bottom: 1px solid var(--border); margin-bottom: 4px;">
                        <div style="font-weight: 600; color: var(--text-primary);">${currentUser.username || 'User'}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${currentUser.email}</div>
                    </div>
                    <button onclick="openSettingsFromMenu()" style="width: 100%; padding: 8px 12px; background: none; border: none; color: var(--text-primary); cursor: pointer; border-radius: 4px; text-align: left; font-size: 14px; transition: var(--transition);" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                        <i class="fas fa-gear"></i> Settings
                    </button>
                    <button onclick="signOut()" style="width: 100%; padding: 8px 12px; background: none; border: none; color: var(--danger); cursor: pointer; border-radius: 4px; text-align: left; font-size: 14px; transition: var(--transition);" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">
                        <i class="fas fa-sign-out-alt"></i> Sign Out
                    </button>
                </div>
            `;
            
            // Remove existing menu if any
            const existingMenu = document.querySelector('[data-user-menu]');
            if (existingMenu) {
                existingMenu.remove();
                return;
            }
            
            const menuEl = document.createElement('div');
            menuEl.setAttribute('data-user-menu', 'true');
            menuEl.innerHTML = menu;
            document.body.appendChild(menuEl);
            
            // Close menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closeMenu(e) {
                    if (!menuEl.contains(e.target) && !e.target.closest('.sign-in-btn')) {
                        menuEl.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                }, { once: true });
            }, 100);
        }

        function openSettingsFromMenu() {
            // Close user menu
            const menu = document.querySelector('[data-user-menu]');
            if (menu) menu.remove();
            
            // Open settings modal
            showSettings();
        }

        function signOut() {
            localStorage.removeItem('authToken');
            currentUser = null;
            
            // Clear user data
            generatedImages = []; // Clear image library
            conversations = []; // Clear conversations
            messages = []; // Clear messages
            currentConversationId = null;
            
            // Clear localStorage items (but keep theme and other preferences)
            localStorage.removeItem('generatedImages');
            localStorage.removeItem('conversations');
            localStorage.removeItem('messages');
            localStorage.removeItem('currentConversationId');
            localStorage.removeItem('userId');
            
            // Reset UI
            const signInBtn = document.getElementById('signInBtn');
            
            if (signInBtn) {
                signInBtn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span>Sign in</span>
                `;
                signInBtn.onclick = showSignIn;
            }
            
            const note = document.querySelector('.conversations-note');
            if (note) {
                note.textContent = 'Sign in to save our conversations.';
                note.style.color = '';
            }
            
            // Remove user menu
            const menu = document.querySelector('[data-user-menu]');
            if (menu) menu.remove();
            
            // Clear messages container if on library view
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer && currentSection === 'library') {
                messagesContainer.innerHTML = `
                    <div class="library-empty">
                        <div class="empty-state">
                            <i class="fas fa-images"></i>
                            <h3>No Images Yet</h3>
                            <p>Sign in and generate some images to see them here!</p>
                            <button onclick="showSignIn()" class="btn-primary">
                                <i class="fas fa-sign-in-alt"></i> Sign In
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Clear chat messages if on chat view
            if (currentSection === 'chat' && messagesContainer) {
                messagesContainer.innerHTML = '';
            }
            
            // Clear sidebar conversations
            renderConversationsList([]);
            
            alert('You have been signed out successfully.');
            
            // Force page reload to ensure clean state
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }

        function showAuthError(elementId, message) {
            const errorEl = document.getElementById(elementId);
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }

        function showAuthSuccess(elementId, message) {
            const successEl = document.getElementById(elementId);
            successEl.textContent = message;
            successEl.classList.add('show');
        }

        function clearAuthMessages() {
            document.querySelectorAll('.auth-error, .auth-success').forEach(el => {
                el.classList.remove('show');
                el.textContent = '';
            });
        }

        // ==================== SETTINGS FUNCTIONS ====================
        let userSettings = {
            theme: 'dark-theme',
            fontSize: 'medium',
            responseStyle: 'balanced',
            autoScroll: true,
            timestamps: false,
            sound: false,
            saveHistory: true,
            analytics: true,
            keyboardShortcuts: true,
            devMode: false,
            voice: 'juniper',
            voiceSpeed: 'normal',
            voiceOutput: true,
            savedMemories: true,
            chatHistory: true,
            emojiUsage: 'default' // Options: 'default', 'more', 'less'
        };

        function showSettings() {
            const modal = document.getElementById('settingsModal');
            modal.classList.add('active');
            loadSettingsToUI();
        }

        function openSettingsModal() {
            const modal = document.getElementById('settingsModal');
            modal.classList.add('active');
            loadSettingsToUI();
        }
        window.openSettingsModal = openSettingsModal;

        function openAccountsModal() {
            // For now, open edit profile modal - can be expanded to show account management
            openEditProfileModal();
        }
        window.openAccountsModal = openAccountsModal;

        function openUserProfileQuick() {
            // Quick access to user profile/account settings
            openEditProfileModal();
        }
        window.openUserProfileQuick = openUserProfileQuick;

        // Toggle footer menu visibility
        function toggleFooterMenu() {
            const sidebar = document.querySelector('.sidebar');
            const footerMenu = document.getElementById('footerMenuButtons');
            
            // Toggle menu in both collapsed and expanded states
            footerMenu.classList.toggle('expanded');
        }
        window.toggleFooterMenu = toggleFooterMenu;

        // Handle profile section click
        function handleProfileClick() {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar.classList.contains('expanded')) {
                openEditProfileModal();
            }
        }
        window.handleProfileClick = handleProfileClick;

        // Handle avatar click on user button
        function handleAvatarClick(event) {
            event.stopPropagation();
            event.preventDefault();
            openEditProfileModal();
        }
        window.handleAvatarClick = handleAvatarClick;

        // Close footer menu when clicking outside
        document.addEventListener('click', function(e) {
            const sidebar = document.querySelector('.sidebar');
            const footerMenu = document.getElementById('footerMenuButtons');
            const userBtn = document.querySelector('.footer-user-btn');
            
            if (!sidebar.classList.contains('expanded') && 
                footerMenu && footerMenu.classList.contains('expanded') &&
                !footerMenu.contains(e.target) && 
                !userBtn.contains(e.target)) {
                footerMenu.classList.remove('expanded');
            }
        });

        function closeSettingsModal() {
            const modal = document.getElementById('settingsModal');
            modal.classList.remove('active');
        }
        window.closeSettingsModal = closeSettingsModal;

        function loadSettingsToUI() {
            // Load settings from localStorage (per-user)
            const userId = currentUser?.userId || currentUser?.id;
            const settingsKey = userId ? `userSettings_${userId}` : 'userSettings';
            const savedSettings = localStorage.getItem(settingsKey);
            if (savedSettings) {
                userSettings = { ...userSettings, ...JSON.parse(savedSettings) };
            }

            // Update UI elements
            document.getElementById('themeSelect').value = userSettings.theme;
            document.getElementById('fontSizeSelect').value = userSettings.fontSize;
            document.getElementById('responseStyleSelect').value = userSettings.responseStyle;
            document.getElementById('voiceSelect').value = userSettings.voice;
            document.getElementById('voiceSpeedSelect').value = userSettings.voiceSpeed;
            if (document.getElementById('emojiUsageSelect')) {
                document.getElementById('emojiUsageSelect').value = userSettings.emojiUsage || 'default';
            }
            
            // Update toggles
            updateToggle('autoScrollToggle', userSettings.autoScroll);
            updateToggle('timestampsToggle', userSettings.timestamps);
            updateToggle('soundToggle', userSettings.sound);
            updateToggle('saveHistoryToggle', userSettings.saveHistory);
            updateToggle('analyticsToggle', userSettings.analytics);
            updateToggle('keyboardShortcutsToggle', userSettings.keyboardShortcuts);
            updateToggle('devModeToggle', userSettings.devMode);
            updateToggle('voiceOutputToggle', userSettings.voiceOutput);
            updateToggle('savedMemoriesToggle', userSettings.savedMemories);
            updateToggle('chatHistoryToggle', userSettings.chatHistory);

            // Update account section if user is logged in
            if (currentUser) {
                document.getElementById('accountSection').style.display = 'block';
                
                const userId = currentUser.userId || currentUser.id;
                const displayName = localStorage.getItem(`userDisplayName_${userId}`) || currentUser.displayName || currentUser.username || currentUser.email.split('@')[0];
                document.getElementById('userDisplayNameSetting').textContent = displayName;
                document.getElementById('userEmail').textContent = currentUser.email;
                document.getElementById('userUsername').textContent = currentUser.username || currentUser.email.split('@')[0];
                
                // Set member since date
                const createdAt = currentUser.createdAt || Date.now();
                const memberDate = new Date(createdAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                document.getElementById('memberSince').textContent = memberDate;
            } else {
                document.getElementById('accountSection').style.display = 'none';
            }
        }

        function updateToggle(toggleId, isActive) {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                if (isActive) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }
        }

        function toggleSetting(settingName, element) {
            const isActive = element.classList.toggle('active');
            userSettings[settingName] = isActive;
            
            // Apply setting immediately
            applySetting(settingName, isActive);
        }

        function changeThemeFromSettings(theme) {
            userSettings.theme = theme;
            applyTheme(theme);
        }

        function applyTheme(theme) {
            document.body.className = theme;
            localStorage.setItem('theme', theme);
        }

        function changeFontSize(size) {
            userSettings.fontSize = size;
            const sizes = {
                'small': '14px',
                'medium': '16px',
                'large': '18px'
            };
            document.documentElement.style.fontSize = sizes[size];
            localStorage.setItem('fontSize', size);
        }

        function changeDefaultResponseStyle(style) {
            userSettings.responseStyle = style;
            currentQuickResponse = style;
            selectQuickResponse(style);
        }

        function changeVoice(voice) {
            userSettings.voice = voice;
            console.log('Voice changed to:', voice);
            // You can add voice synthesis implementation here
        }

        function changeVoiceSpeed(speed) {
            userSettings.voiceSpeed = speed;
            console.log('Voice speed changed to:', speed);
            // You can add voice speed adjustment implementation here
        }

        function changeEmojiUsage(usage) {
            userSettings.emojiUsage = usage;
            console.log('Emoji usage changed to:', usage);
            // Save setting immediately
            saveSettings();
        }
        window.changeEmojiUsage = changeEmojiUsage;

        function applySetting(settingName, value) {
            switch(settingName) {
                case 'devMode':
                    if (value) {
                        console.log('Developer mode enabled');
                    }
                    break;
                case 'timestamps':
                    // Would update message display
                    console.log('Timestamps:', value);
                    break;
                case 'sound':
                    console.log('Sound effects:', value);
                    break;
                case 'savedMemories':
                    console.log('Saved memories:', value);
                    if (!value) {
                        console.log('Memory references disabled');
                    }
                    break;
                case 'chatHistory':
                    console.log('Chat history references:', value);
                    if (!value) {
                        console.log('Chat history references disabled');
                    }
                    break;
                default:
                    console.log(`Setting ${settingName}:`, value);
            }
        }

        function saveSettings() {
            const userId = currentUser?.userId || currentUser?.id;
            const settingsKey = userId ? `userSettings_${userId}` : 'userSettings';
            localStorage.setItem(settingsKey, JSON.stringify(userSettings));
            
            // Show success message
            const footer = document.querySelector('.settings-footer');
            const successMsg = document.createElement('div');
            successMsg.textContent = 'Settings saved!';
            successMsg.style.cssText = 'color: var(--success); font-weight: 500; margin-right: auto;';
            footer.insertBefore(successMsg, footer.firstChild);
            
            setTimeout(() => {
                successMsg.remove();
            }, 2000);
        }
        window.saveSettings = saveSettings;

        function resetSettings() {
            if (confirm('Are you sure you want to reset all settings to default?')) {
                userSettings = {
                    theme: 'dark-theme',
                    fontSize: 'medium',
                    responseStyle: 'balanced',
                    autoScroll: true,
                    timestamps: false,
                    sound: false,
                    saveHistory: true,
                    analytics: true,
                    keyboardShortcuts: true,
                    devMode: false,
                    voice: 'juniper',
                    voiceSpeed: 'normal',
                    voiceOutput: true,
                    savedMemories: true,
                    chatHistory: true,
                    emojiUsage: 'default'
                };
                
                const userId = currentUser?.userId || currentUser?.id;
                const settingsKey = userId ? `userSettings_${userId}` : 'userSettings';
                localStorage.setItem(settingsKey, JSON.stringify(userSettings));
                loadSettingsToUI();
                
                // Apply theme
                applyTheme(userSettings.theme);
                changeFontSize(userSettings.fontSize);
                
                alert('Settings reset to default!');
            }
        }
        window.resetSettings = resetSettings;

        // ==================== MEMORY MANAGER FUNCTIONS ====================
        
        // Memory storage
        let userMemories = [];

        // Load memories from localStorage
        function loadMemories() {
            try {
                const userId = currentUser?.userId || currentUser?.id;
                const memoryKey = userId ? `memories_${userId}` : 'memories';
                const stored = localStorage.getItem(memoryKey);
                userMemories = stored ? JSON.parse(stored) : [];
                return userMemories;
            } catch (error) {
                console.error('Error loading memories:', error);
                return [];
            }
        }

        // Save memories to localStorage
        function saveMemories() {
            try {
                const userId = currentUser?.userId || currentUser?.id;
                const memoryKey = userId ? `memories_${userId}` : 'memories';
                localStorage.setItem(memoryKey, JSON.stringify(userMemories));
            } catch (error) {
                console.error('Error saving memories:', error);
            }
        }

        // Open Memory Manager Modal
        function openMemoryManager() {
            const modal = document.getElementById('memoryManagerModal');
            if (modal) {
                modal.classList.add('active');
                loadMemories();
                updateMemoryStats();
                renderMemories();
                
                // Initialize with memories tab
                switchMemoryTab('memories');
                
                // Load insights and predictions from memory-ui.js if available
                if (typeof loadUserInsights === 'function') {
                    loadUserInsights();
                }
                if (typeof loadLearningProgress === 'function') {
                    loadLearningProgress();
                }
            }
        }
        window.openMemoryManager = openMemoryManager;

        // Close Memory Manager Modal
        function closeMemoryManager() {
            const modal = document.getElementById('memoryManagerModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }
        window.closeMemoryManager = closeMemoryManager;

        // Switch between memory tabs
        function switchMemoryTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.memory-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-tab') === tabName) {
                    tab.classList.add('active');
                }
            });
            
            // Update tab content
            document.querySelectorAll('.memory-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const activeContent = document.getElementById(`${tabName}TabContent`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
            
            // Load specific tab data
            if (tabName === 'insights' && typeof loadUserInsights === 'function') {
                loadUserInsights();
                if (typeof loadLearningProgress === 'function') {
                    loadLearningProgress();
                }
            } else if (tabName === 'predictions' && typeof loadPredictions === 'function') {
                loadPredictions();
            }
        }
        window.switchMemoryTab = switchMemoryTab;

        // Update memory statistics
        function updateMemoryStats() {
            const totalCount = userMemories.length;
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const recentCount = userMemories.filter(m => m.timestamp > sevenDaysAgo).length;

            const totalEl = document.getElementById('totalMemoriesCount');
            const recentEl = document.getElementById('recentMemoriesCount');
            
            if (totalEl) totalEl.textContent = totalCount;
            if (recentEl) recentEl.textContent = recentCount;
        }

        // Render memories list
        function renderMemories(searchTerm = '') {
            const container = document.getElementById('memoriesList');
            if (!container) return;

            let memories = [...userMemories];
            
            // Filter by search term
            if (searchTerm) {
                memories = memories.filter(m => 
                    m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.category?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Sort by timestamp (newest first)
            memories.sort((a, b) => b.timestamp - a.timestamp);

            if (memories.length === 0) {
                container.innerHTML = `
                    <div class="empty-memories" style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                        <i class="fas fa-brain" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p style="margin: 0; font-size: 14px;">${searchTerm ? 'No matching memories found' : 'No memories saved yet'}</p>
                        <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.7;">
                            ${searchTerm ? 'Try a different search term' : 'Start chatting and important details will be remembered'}
                        </p>
                    </div>
                `;
                return;
            }

            container.innerHTML = memories.map((memory, index) => {
                const date = new Date(memory.timestamp);
                const timeAgo = getTimeAgo(memory.timestamp);
                
                return `
                    <div class="memory-item" data-memory-id="${memory.id}">
                        <div class="memory-item-header">
                            <div style="flex: 1;">
                                ${memory.category ? `<span class="memory-category-badge">${memory.category}</span>` : ''}
                            </div>
                            <div class="memory-item-actions">
                                <button class="memory-action-btn" onclick="editMemory('${memory.id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="memory-action-btn delete" onclick="deleteMemory('${memory.id}')" title="Delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="memory-item-content">${escapeHtml(memory.content)}</div>
                        <div class="memory-item-meta">
                            <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                            ${memory.source ? `<span><i class="fas fa-comment"></i> From conversation</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Filter memories by search term
        function filterMemories() {
            const searchInput = document.getElementById('memorySearchInput');
            if (searchInput) {
                renderMemories(searchInput.value);
            }
        }
        window.filterMemories = filterMemories;

        // Add a new memory
        function addMemory(content, category = null, source = null) {
            const memory = {
                id: Date.now().toString(),
                content: content,
                category: category,
                source: source,
                timestamp: Date.now()
            };
            
            userMemories.push(memory);
            saveMemories();
            return memory;
        }
        window.addMemory = addMemory;

        // Edit a memory
        function editMemory(memoryId) {
            const memory = userMemories.find(m => m.id === memoryId);
            if (!memory) return;

            const newContent = prompt('Edit memory:', memory.content);
            if (newContent && newContent.trim() !== '') {
                memory.content = newContent.trim();
                memory.timestamp = Date.now(); // Update timestamp
                saveMemories();
                renderMemories();
                updateMemoryStats();
            }
        }
        window.editMemory = editMemory;

        // Delete a memory
        function deleteMemory(memoryId) {
            if (confirm('Are you sure you want to delete this memory?')) {
                userMemories = userMemories.filter(m => m.id !== memoryId);
                saveMemories();
                renderMemories();
                updateMemoryStats();
            }
        }
        window.deleteMemory = deleteMemory;

        // Clear all memories - DISABLED (using memory-ui.js version that calls backend API)
        // function clearAllMemories() {
        //     if (confirm('Are you sure you want to delete all memories? This action cannot be undone.')) {
        //         userMemories = [];
        //         saveMemories();
        //         renderMemories();
        //         updateMemoryStats();
        //     }
        // }
        // window.clearAllMemories = clearAllMemories;

        // Export memories as JSON
        function exportMemories() {
            if (userMemories.length === 0) {
                alert('No memories to export!');
                return;
            }

            const dataStr = JSON.stringify(userMemories, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `copilotx-memories-${Date.now()}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
        }
        window.exportMemories = exportMemories;

        // Helper function to get time ago string
        function getTimeAgo(timestamp) {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            
            if (seconds < 60) return 'Just now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
            if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
            return new Date(timestamp).toLocaleDateString();
        }

        // Helper function to escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Initialize memory system when user signs in
        function initializeMemorySystem() {
            loadMemories();
            
            // Initialize memory UI from memory-ui.js if available
            if (typeof initMemoryUI === 'function') {
                initMemoryUI();
            }
            
            // Add some sample memories for demonstration (can be removed)
            if (userMemories.length === 0 && currentUser) {
                addMemory('User prefers detailed explanations', 'Preferences', 'conversation');
                addMemory('Working on a CopilotX AI project', 'Projects', 'conversation');
            }
        }

        // Sync memories with backend API
        async function syncMemoriesWithBackend() {
            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) return;

                const response = await fetch(`${API_BASE_URL}/api/memory/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                        'user-id': localStorage.getItem('userId') || ''
                    },
                    body: JSON.stringify({ memories: userMemories })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Memories synced with backend');
                }
            } catch (error) {
                console.error('Error syncing memories:', error);
            }
        }
        window.syncMemoriesWithBackend = syncMemoriesWithBackend;

        // Add feedback to messages for learning
        function addMessageFeedback(messageId, isHelpful) {
            if (typeof recordFeedback === 'function') {
                const feedbackType = isHelpful ? 'helpful' : 'not_helpful';
                recordFeedback(messageId, feedbackType);
            }
        }
        window.addMessageFeedback = addMessageFeedback;

        // Account Management Functions
        function openChangePasswordModal() {
            const newPassword = prompt('Enter new password:');
            if (newPassword && newPassword.length >= 6) {
                const confirmPassword = prompt('Confirm new password:');
                if (newPassword === confirmPassword) {
                    changePassword(newPassword);
                } else {
                    alert('Passwords do not match!');
                }
            } else if (newPassword) {
                alert('Password must be at least 6 characters long.');
            }
        }
        window.openChangePasswordModal = openChangePasswordModal;

        async function changePassword(newPassword) {
            if (!currentUser) {
                alert('Please sign in first.');
                return;
            }

            try {
                // Try to update on server if API exists
                const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                        userId: currentUser.userId,
                        newPassword: newPassword
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // Store password hash locally as backup
                        localStorage.setItem('userPasswordHash', btoa(newPassword));
                        alert('Password changed successfully!');
                    } else {
                        throw new Error(data.message || 'Failed to change password');
                    }
                } else if (response.status === 404) {
                    // API endpoint doesn't exist yet, save locally
                    console.log('Password change API not available, saving locally');
                    localStorage.setItem('userPasswordHash', btoa(newPassword));
                    alert('Password updated locally. Backend sync pending.');
                } else {
                    throw new Error('Server error: ' + response.status);
                }
            } catch (error) {
                console.error('Change password error:', error);
                // Fallback: save password locally
                localStorage.setItem('userPasswordHash', btoa(newPassword));
                alert('Password saved locally. Will sync when backend is available.');
            }
        }

        function deleteAccountConfirm() {
            const confirmation = prompt('This action cannot be undone. Type "DELETE" to confirm:');
            if (confirmation === 'DELETE') {
                const finalConfirm = confirm('Are you absolutely sure you want to delete your account? All your data will be permanently lost.');
                if (finalConfirm) {
                    deleteAccount();
                }
            } else if (confirmation !== null) {
                alert('Account deletion cancelled. Please type "DELETE" exactly to confirm.');
            }
        }
        window.deleteAccountConfirm = deleteAccountConfirm;

        async function deleteAccount() {
            if (!currentUser) {
                alert('Please sign in first.');
                return;
            }

            try {
                // Try to delete from server if API exists
                const response = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                        userId: currentUser.userId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        alert('Account deleted successfully. You will be signed out.');
                        // Clear all data and reload
                        localStorage.clear();
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                        return;
                    }
                } else if (response.status === 404) {
                    // API endpoint doesn't exist yet, delete locally
                    console.log('Delete account API not available, deleting locally');
                    alert('Account data cleared locally. You will be signed out.');
                    // Clear all data and reload
                    localStorage.clear();
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    return;
                } else {
                    throw new Error('Server error: ' + response.status);
                }
            } catch (error) {
                console.error('Delete account error:', error);
                // Fallback: clear local data
                const shouldDelete = confirm('Unable to reach server. Clear local account data anyway?');
                if (shouldDelete) {
                    alert('Local account data cleared.');
                    // Clear all data and reload
                    localStorage.clear();
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            }
        }

        // Edit Profile Modal Functions
        function openEditProfileModal() {
            const modal = document.getElementById('editProfileModal');
            modal.classList.add('active');
            loadProfileToUI();
        }
        window.openEditProfileModal = openEditProfileModal;

        function closeEditProfileModal() {
            const modal = document.getElementById('editProfileModal');
            modal.classList.remove('active');
        }
        window.closeEditProfileModal = closeEditProfileModal;

        function loadProfileToUI() {
            // Load profile from localStorage or currentUser (per-user)
            const userId = currentUser?.userId || currentUser?.id;
            const displayName = userId ? (localStorage.getItem(`userDisplayName_${userId}`) || currentUser?.displayName) : (currentUser?.displayName || 'User');
            const username = userId ? (localStorage.getItem(`userUsername_${userId}`) || currentUser?.username) : (currentUser?.username || 'user');
            
            document.getElementById('editDisplayName').value = displayName;
            document.getElementById('editUsername').value = username;
            
            // Update avatar with profile picture or initials
            const profilePicture = userId ? localStorage.getItem(`userProfilePicture_${userId}`) : null;
            const initials = displayName ? displayName.split(/[\s_]+/).map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
            const editProfileAvatar = document.getElementById('editProfileAvatar');
            
            if (editProfileAvatar) {
                if (profilePicture) {
                    editProfileAvatar.style.backgroundImage = `url(${profilePicture})`;
                    editProfileAvatar.style.backgroundSize = 'cover';
                    editProfileAvatar.style.backgroundPosition = 'center';
                    editProfileAvatar.textContent = '';
                } else {
                    editProfileAvatar.style.backgroundImage = '';
                    editProfileAvatar.textContent = initials;
                }
            }
        }

        async function saveProfile() {
            const displayName = document.getElementById('editDisplayName').value.trim();
            const username = document.getElementById('editUsername').value.trim();

            if (!displayName || !username) {
                alert('Please fill in all fields');
                return;
            }

            // Validate username format (alphanumeric and underscores only)
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                alert('Username can only contain letters, numbers, and underscores');
                return;
            }

            try {
                // Save to localStorage (per-user)
                const userId = currentUser?.userId || currentUser?.id;
                if (userId) {
                    localStorage.setItem(`userDisplayName_${userId}`, displayName);
                    localStorage.setItem(`userUsername_${userId}`, username);
                }

                // Update currentUser object
                if (currentUser) {
                    currentUser.displayName = displayName;
                    currentUser.username = username;
                }

                // Update sidebar display
                const sidebarDisplayNameEl = document.getElementById('sidebarDisplayName');
                const quickAccessUsernameEl = document.getElementById('quickAccessUsername');
                
                if (sidebarDisplayNameEl) {
                    sidebarDisplayNameEl.textContent = displayName;
                }
                
                if (quickAccessUsernameEl) {
                    quickAccessUsernameEl.textContent = displayName;
                }

                // Update avatar initials
                const initials = displayName ? displayName.split(/[\s_]+/).map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
                const avatars = document.querySelectorAll('#userAvatar, #editProfileAvatar');
                avatars.forEach(avatar => {
                    avatar.textContent = initials;
                });

                // Try to update backend if user is authenticated
                const authToken = localStorage.getItem('authToken');
                if (authToken && currentUser?.id) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${authToken}`
                            },
                            body: JSON.stringify({
                                displayName: displayName,
                                username: username
                            })
                        });

                        if (!response.ok) {
                            console.warn('Failed to update profile on backend, but local changes saved');
                        } else {
                            console.log('✅ Profile updated on backend');
                        }
                    } catch (error) {
                        console.warn('Could not update profile on backend:', error);
                    }
                }

                // Show success message
                const footer = document.querySelector('#editProfileModal .settings-footer');
                const successMsg = document.createElement('div');
                successMsg.textContent = 'Profile updated!';
                successMsg.style.cssText = 'color: var(--success); font-weight: 500; margin-right: auto;';
                footer.insertBefore(successMsg, footer.firstChild);
                
                setTimeout(() => {
                    successMsg.remove();
                    closeEditProfileModal();
                }, 1500);

            } catch (error) {
                console.error('Error saving profile:', error);
                alert('Failed to save profile. Please try again.');
            }
        }
        window.saveProfile = saveProfile;

        function changeProfilePicture() {
            // Create hidden file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size must be less than 5MB');
                    return;
                }
                
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select a valid image file');
                    return;
                }
                
                try {
                    // Read file as base64
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        const base64Image = event.target.result;
                        
                        // Compress and resize image
                        compressImage(base64Image, async (compressedImage) => {
                            const userId = currentUser?.userId || currentUser?.id;
                            if (!userId) {
                                alert('Please sign in to upload a profile picture');
                                return;
                            }
                            
                            // Save to localStorage with user ID
                            localStorage.setItem(`userProfilePicture_${userId}`, compressedImage);
                            
                            // Update all avatar displays
                            updateAllAvatars(compressedImage);
                            
                            // Sync to backend (required for per-user storage)
                            const synced = await syncProfilePictureToBackend(compressedImage);
                            if (synced) {
                                alert('Profile picture updated successfully!');
                            } else {
                                alert('Profile picture saved locally. Will sync when server is available.');
                            }
                        });
                    };
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Error uploading profile picture:', error);
                    alert('Failed to upload profile picture');
                }
            };
            
            // Trigger file selection
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        }
        window.changeProfilePicture = changeProfilePicture;

        function compressImage(base64Image, callback) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max dimensions
                const maxWidth = 400;
                const maxHeight = 400;
                
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with compression
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                callback(compressedBase64);
            };
            img.src = base64Image;
        }

        function updateAllAvatars(imageUrl) {
            // Update main sidebar avatar
            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar) {
                userAvatar.style.backgroundImage = `url(${imageUrl})`;
                userAvatar.style.backgroundSize = 'cover';
                userAvatar.style.backgroundPosition = 'center';
                userAvatar.textContent = '';
            }
            
            // Update button avatar
            const userAvatarBtn = document.getElementById('userAvatarBtn');
            if (userAvatarBtn) {
                userAvatarBtn.style.backgroundImage = `url(${imageUrl})`;
                userAvatarBtn.style.backgroundSize = 'cover';
                userAvatarBtn.style.backgroundPosition = 'center';
                userAvatarBtn.textContent = '';
            }
            
            // Update edit profile modal avatar
            const editProfileAvatar = document.getElementById('editProfileAvatar');
            if (editProfileAvatar) {
                editProfileAvatar.style.backgroundImage = `url(${imageUrl})`;
                editProfileAvatar.style.backgroundSize = 'cover';
                editProfileAvatar.style.backgroundPosition = 'center';
                editProfileAvatar.textContent = '';
            }
        }

        async function removeProfilePicture() {
            if (confirm('Remove profile picture and show initials instead?')) {
                const userId = currentUser?.userId || currentUser?.id;
                if (!userId) {
                    alert('Please sign in to remove profile picture');
                    return;
                }
                
                // Remove from localStorage
                localStorage.removeItem(`userProfilePicture_${userId}`);
                
                // Remove from backend
                await syncProfilePictureToBackend(null);
                
                // Restore initials
                const displayName = localStorage.getItem(`userDisplayName_${userId}`) || currentUser?.displayName || currentUser?.username || 'User';
                const initials = displayName.split(/[\s_]+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);
                
                // Update all avatars to show initials
                const avatars = ['userAvatar', 'userAvatarBtn', 'editProfileAvatar'];
                avatars.forEach(id => {
                    const avatar = document.getElementById(id);
                    if (avatar) {
                        avatar.style.backgroundImage = '';
                        avatar.textContent = initials;
                    }
                });
                
                alert('Profile picture removed!');
            }
        }
        window.removeProfilePicture = removeProfilePicture;

        async function syncProfilePictureToBackend(imageBase64) {
            if (!currentUser) return false;
            
            try {
                const userId = currentUser.userId || currentUser.id;
                const response = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                        userId: userId,
                        profilePicture: imageBase64
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Profile picture synced to backend for user:', userId);
                    return true;
                }
                console.log('❌ Backend sync failed:', response.status);
                return false;
            } catch (error) {
                console.log('❌ Backend sync error:', error.message);
                return false;
            }
        }

        function clearCache() {
            if (confirm('Clear cache? This will remove temporary data.')) {
                // Clear specific cache items
                const cacheKeys = ['tempData', 'cachedResponses'];
                cacheKeys.forEach(key => localStorage.removeItem(key));
                alert('Cache cleared!');
            }
        }
        window.clearCache = clearCache;

        function clearAllData() {
            if (confirm('Clear all data? This will sign you out and delete all local data. This action cannot be undone!')) {
                if (confirm('Are you absolutely sure? This will delete everything.')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    alert('All data cleared! The page will reload.');
                    window.location.reload();
                }
            }
        }
        window.clearAllData = clearAllData;

        // Initialize avatar with user data on page load
        function initializeAvatar() {
            // Check if user is authenticated
            const token = localStorage.getItem('authToken');
            if (!token || !currentUser) {
                // Set default initials for non-authenticated user
                const userAvatar = document.getElementById('userAvatar');
                const userAvatarBtn = document.getElementById('userAvatarBtn');
                if (userAvatar) userAvatar.textContent = 'U';
                if (userAvatarBtn) userAvatarBtn.textContent = 'U';
                return;
            }
            
            // Load user data
            const userId = currentUser?.userId || currentUser?.id;
            const displayName = localStorage.getItem(`userDisplayName_${userId}`) || currentUser?.displayName || currentUser?.username || 'User';
            const profilePicture = localStorage.getItem(`userProfilePicture_${userId}`);
            const initials = displayName.split(/[\s_]+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
            // Update avatars
            const userAvatar = document.getElementById('userAvatar');
            const userAvatarBtn = document.getElementById('userAvatarBtn');
            
            if (profilePicture) {
                // Show profile picture
                if (userAvatar) {
                    userAvatar.style.backgroundImage = `url(${profilePicture})`;
                    userAvatar.style.backgroundSize = 'cover';
                    userAvatar.style.backgroundPosition = 'center';
                    userAvatar.textContent = '';
                }
                if (userAvatarBtn) {
                    userAvatarBtn.style.backgroundImage = `url(${profilePicture})`;
                    userAvatarBtn.style.backgroundSize = 'cover';
                    userAvatarBtn.style.backgroundPosition = 'center';
                    userAvatarBtn.textContent = '';
                }
            } else {
                // Show initials
                if (userAvatar) {
                    userAvatar.style.backgroundImage = '';
                    userAvatar.textContent = initials;
                }
                if (userAvatarBtn) {
                    userAvatarBtn.style.backgroundImage = '';
                    userAvatarBtn.textContent = initials;
                }
            }
        }

        // Load saved settings on page load
        function initializeSettings() {
            const userId = currentUser?.userId || currentUser?.id;
            const settingsKey = userId ? `userSettings_${userId}` : 'userSettings';
            const savedSettings = localStorage.getItem(settingsKey);
            if (savedSettings) {
                userSettings = { ...userSettings, ...JSON.parse(savedSettings) };
                
                // Apply saved settings
                applyTheme(userSettings.theme);
                if (userSettings.fontSize !== 'medium') {
                    changeFontSize(userSettings.fontSize);
                }
                if (userSettings.responseStyle !== 'balanced') {
                    currentQuickResponse = userSettings.responseStyle;
                }
            }
        }

        // ==================== OCR INTEGRATION ====================
        
        /**
         * Handle file input for PDF/Document OCR
         */
        document.addEventListener('DOMContentLoaded', function() {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        if (file.type === 'application/pdf') {
                            await handlePdfUpload(file);
                        } else if (file.type.startsWith('image/')) {
                            await handleImageUpload(file);
                        }
                    }
                    fileInput.value = '';
                });
            }

            const photoInput = document.getElementById('photoInput');
            if (photoInput) {
                photoInput.addEventListener('change', async (e) => {
                    const files = Array.from(e.target.files);
                    for (const file of files) {
                        if (file.type.startsWith('image/')) {
                            await handleImageUpload(file);
                        }
                    }
                    photoInput.value = '';
                });
            }
        });

        /**
         * Handle image file upload for OCR
         */
        async function handleImageUpload(file) {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to upload and process files.', 'assistant');
                return;
            }

            try {
                addMessageWithHtml(`📸 Processing image: <strong>${file.name}</strong>...`, 'system');
                
                const formData = new FormData();
                formData.append('image', file);
                formData.append('language', 'eng');

                const response = await fetch(`${API_BASE_URL}/api/ocr/extract`, {
                    method: 'POST',
                    body: formData,
                    timeout: 30000
                });

                const result = await response.json();

                if (result.success) {
                    const data = result.data;
                    
                    // Store OCR result for AI reference
                    const ocrEntry = {
                        id: Date.now(),
                        type: 'image',
                        filename: file.name,
                        extractedText: data.text,
                        confidence: data.confidence,
                        metadata: {
                            wordCount: data.wordCount,
                            lineCount: data.lineCount,
                            processingTime: data.processingTime,
                            language: data.language
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    ocrResults.push(ocrEntry);
                    updateOcrContext();
                    
                    const htmlMessage = `
<div style="background: #f0f4ff; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5;">
    <h3 style="color: #4f46e5; margin: 0 0 12px 0;">📷 Image OCR Results</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 4px; color: #666;"><strong>File:</strong></td><td style="padding: 4px; color: #333;">${file.name}</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Confidence:</strong></td><td style="padding: 4px; color: #333;">${data.confidence?.toFixed(1)}%</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Words Found:</strong></td><td style="padding: 4px; color: #333;">${data.wordCount || 0}</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Processing Time:</strong></td><td style="padding: 4px; color: #333;">${(data.processingTime / 1000).toFixed(2)}s</td></tr>
    </table>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        <strong style="color: #333;">Extracted Text:</strong>
        <div style="background: white; padding: 12px; border-radius: 6px; margin-top: 8px; font-family: monospace; font-size: 13px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">
${escapeHtml(data.text.substring(0, 1000))}${data.text.length > 1000 ? '...\n\n[Text truncated for display]' : ''}
        </div>
    </div>
    <div style="margin-top: 12px; padding: 8px; background: #e8f3ff; border-radius: 6px; font-size: 12px; color: #0c2d6b;">
        <strong>ℹ️ You can now ask me questions about this image!</strong>
    </div>
</div>`;
                    addMessageWithHtml(htmlMessage, 'assistant');
                } else {
                    addMessageWithHtml(`❌ <strong>OCR Error:</strong> ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('❌ Image upload error:', error);
                addMessageWithHtml(`❌ <strong>Failed to process image:</strong> ${error.message}`, 'error');
            }
        }

        /**
         * Handle PDF file upload for OCR
         */
        async function handlePdfUpload(file) {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to upload and process files.', 'assistant');
                return;
            }

            try {
                addMessageWithHtml(`📄 Processing PDF: <strong>${file.name}</strong>...`, 'system');
                
                const formData = new FormData();
                formData.append('pdf', file);
                formData.append('language', 'eng');

                const response = await fetch(`${API_BASE_URL}/api/ocr/extract-pdf-direct`, {
                    method: 'POST',
                    body: formData,
                    timeout: 30000
                });

                const result = await response.json();

                if (result.success) {
                    const data = result.data;
                    
                    // Store OCR result for AI reference
                    const ocrEntry = {
                        id: Date.now(),
                        type: 'pdf',
                        filename: file.name,
                        extractedText: data.text,
                        confidence: 100, // Direct extraction is 100% if it works
                        metadata: {
                            totalPages: data.totalPages,
                            pdfVersion: data.version,
                            processingTime: 0
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    ocrResults.push(ocrEntry);
                    updateOcrContext();
                    
                    const htmlMessage = `
<div style="background: #f0f4ff; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5;">
    <h3 style="color: #4f46e5; margin: 0 0 12px 0;">📄 PDF Text Extraction Results</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 4px; color: #666;"><strong>File:</strong></td><td style="padding: 4px; color: #333;">${file.name}</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Total Pages:</strong></td><td style="padding: 4px; color: #333;">${data.totalPages || 0}</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>PDF Version:</strong></td><td style="padding: 4px; color: #333;">${data.version || 'N/A'}</td></tr>
    </table>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        <strong style="color: #333;">Extracted Text:</strong>
        <div style="background: white; padding: 12px; border-radius: 6px; margin-top: 8px; font-family: monospace; font-size: 13px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">
${escapeHtml(data.text.substring(0, 1000))}${data.text.length > 1000 ? '...\n\n[Text truncated for display]' : ''}
        </div>
    </div>
    <div style="margin-top: 12px; padding: 8px; background: #e8f3ff; border-radius: 6px; font-size: 12px; color: #0c2d6b;">
        <strong>ℹ️ You can now ask me questions about this document!</strong>
    </div>
</div>`;
                    addMessageWithHtml(htmlMessage, 'assistant');
                } else {
                    // Try OCR if direct extraction fails
                    await handlePdfWithOcr(file);
                }
            } catch (error) {
                console.error('❌ PDF upload error:', error);
                addMessageWithHtml(`❌ <strong>Failed to process PDF:</strong> ${error.message}`, 'error');
            }
        }

        /**
         * Handle PDF with OCR (for scanned PDFs)
         */
        async function handlePdfWithOcr(file) {
            try {
                addMessageWithHtml(`🔄 Using OCR to process scanned PDF...`, 'system');
                
                const formData = new FormData();
                formData.append('pdf', file);
                formData.append('language', 'eng');

                const response = await fetch(`${API_BASE_URL}/api/ocr/extract-pdf`, {
                    method: 'POST',
                    body: formData,
                    timeout: 120000 // 2 minute timeout for OCR
                });

                const result = await response.json();

                if (result.success) {
                    const data = result.data;
                    
                    // Store OCR result for AI reference
                    const ocrEntry = {
                        id: Date.now(),
                        type: 'pdf-ocr',
                        filename: file.name,
                        extractedText: data.text,
                        confidence: data.confidence,
                        metadata: {
                            totalPages: data.totalPages,
                            processedPages: data.processedPages,
                            processingTime: data.processingTime,
                            language: data.language
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    ocrResults.push(ocrEntry);
                    updateOcrContext();
                    
                    const htmlMessage = `
<div style="background: #f0f4ff; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5;">
    <h3 style="color: #4f46e5; margin: 0 0 12px 0;">📄 PDF OCR Results</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 4px; color: #666;"><strong>File:</strong></td><td style="padding: 4px; color: #333;">${file.name}</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Total Pages:</strong></td><td style="padding: 4px; color: #333;">${data.totalPages || 0}</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Pages Processed:</strong></td><td style="padding: 4px; color: #333;">${data.processedPages || 0}</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Average Confidence:</strong></td><td style="padding: 4px; color: #333;">${data.confidence?.toFixed(1)}%</td></tr>
        <tr><td style="padding: 4px; color: #666;"><strong>Processing Time:</strong></td><td style="padding: 4px; color: #333;">${(data.processingTime / 1000).toFixed(2)}s</td></tr>
    </table>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        <strong style="color: #333;">Extracted Text:</strong>
        <div style="background: white; padding: 12px; border-radius: 6px; margin-top: 8px; font-family: monospace; font-size: 13px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">
${escapeHtml(data.text.substring(0, 1000))}${data.text.length > 1000 ? '...\n\n[Text truncated for display]' : ''}
        </div>
    </div>
    <div style="margin-top: 12px; padding: 8px; background: #e8f3ff; border-radius: 6px; font-size: 12px; color: #0c2d6b;">
        <strong>ℹ️ You can now ask me questions about this document!</strong>
    </div>
</div>`;
                    addMessageWithHtml(htmlMessage, 'assistant');
                } else {
                    addMessageWithHtml(`❌ <strong>OCR Error:</strong> ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('❌ PDF OCR error:', error);
                addMessageWithHtml(`❌ <strong>Failed to process PDF with OCR:</strong> ${error.message}`, 'error');
            }
        }

        /**
         * Update OCR context string for AI
         */
        function updateOcrContext() {
            if (ocrResults.length === 0) {
                currentOcrContext = '';
                return;
            }
            
            const ocrSummary = ocrResults.map((ocr, idx) => {
                return `[Document ${idx + 1}: ${ocr.filename} (${ocr.type})]
${ocr.extractedText.substring(0, 500)}${ocr.extractedText.length > 500 ? '\n...[truncated]' : ''}`;
            }).join('\n\n---\n\n');
            
            currentOcrContext = `I have extracted the following documents/images that you can reference:\n\n${ocrSummary}`;
        }

        /**
         * Helper function to escape HTML
         */
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        /**
         * Add message with HTML support
         */
        function addMessageWithHtml(htmlContent, sender, messageId = null) {
            const messagesContainer = document.getElementById('messagesContainer');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}`;
            
            if (messageId) {
                messageDiv.dataset.messageId = messageId;
            }
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            
            if (sender === 'user') {
                avatar.innerHTML = '<i class="fas fa-user"></i>';
            } else {
                avatar.innerHTML = `
                    <div class="assistant-infinity">
                        <div class="assistant-infinity-icon"></div>
                    </div>
                `;
            }
            
            const contentWrapper = document.createElement('div');
            contentWrapper.style.display = 'flex';
            contentWrapper.style.flexDirection = 'column';
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.innerHTML = htmlContent;
            
            contentWrapper.appendChild(bubble);
            
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            
            if (sender === 'assistant' || sender === 'system') {
                actions.innerHTML = `
                    <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="message-action-btn" onclick="likeMessage(this)" title="Like">
                        <i class="fas fa-thumbs-up"></i>
                    </button>
                    <button class="message-action-btn" onclick="dislikeMessage(this)" title="Dislike">
                        <i class="fas fa-thumbs-down"></i>
                    </button>
                    <button class="message-action-btn" onclick="shareMessage(this)" title="Share">
                        <i class="fas fa-share"></i>
                    </button>
                `;
            } else if (sender === 'error') {
                actions.innerHTML = `
                    <button class="message-action-btn" onclick="copyMessage(this)" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                `;
            }
            
            contentWrapper.appendChild(actions);
            
            if (sender === 'user') {
                messageDiv.appendChild(contentWrapper);
                messageDiv.appendChild(avatar);
            } else {
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(contentWrapper);
            }
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            messages.push({ text: htmlContent, sender, timestamp: new Date() });
        }

        // Carousel
        function setupCarousel() {
            const slides = document.querySelectorAll('.carousel-slide');
            totalSlides = slides.length;
            currentSlide = 0;
            
            slides.forEach((slide) => {
                const card = slide.querySelector('.slide-card');
                if (card) {
                    card.addEventListener('click', () => {
                        const action = slide.querySelector('.slide-action')?.textContent || '';
                        const description = slide.querySelector('.slide-description')?.textContent || '';
                        const prompt = `${action} ${description}`.trim();
                        useSlidePrompt(prompt);
                    });
                }
            });
        }

        function nextSlide() {
            const slides = document.querySelectorAll('.carousel-slide');
            if (slides.length === 0) return;
            
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }
        window.nextSlide = nextSlide;

        function prevSlide() {
            const slides = document.querySelectorAll('.carousel-slide');
            if (slides.length === 0) return;
            
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            slides[currentSlide].classList.add('active');
        }
        window.prevSlide = prevSlide;

        function useSlidePrompt(text) {
            const input = document.getElementById('chatInput');
            input.value = text;
            input.focus();
        }

        function updateCarouselVisibility() {
            const cs = document.getElementById('carouselSection');
            const messagesContainer = document.getElementById('messagesContainer');
            // Only hide carousel if there are actual user messages (not just welcome message)
            const userMessages = messagesContainer?.querySelectorAll('.message.user');
            if (cs) cs.style.display = (userMessages && userMessages.length > 0) ? 'none' : '';
        }

        // ===== VIDEO GENERATION FUNCTIONS =====
        
        function showVideoModal() {
            const modal = document.getElementById('videoModal');
            if (modal) {
                modal.style.display = 'flex';
                document.getElementById('videoPrompt').focus();
            }
        }

        function closeVideoModal() {
            const modal = document.getElementById('videoModal');
            if (modal) {
                modal.style.display = 'none';
                document.getElementById('videoPrompt').value = '';
                document.getElementById('videoCharCount').textContent = '0';
                document.getElementById('videoPreview').style.display = 'none';
                document.getElementById('videoLoading').style.display = 'none';
            }
        }

        // Update character counter for video prompt
        document.addEventListener('DOMContentLoaded', function() {
            const videoPrompt = document.getElementById('videoPrompt');
            if (videoPrompt) {
                videoPrompt.addEventListener('input', function() {
                    const count = this.value.length;
                    document.getElementById('videoCharCount').textContent = count;
                    if (count > 500) {
                        this.value = this.value.substring(0, 500);
                        document.getElementById('videoCharCount').textContent = '500';
                    }
                });
            }
        });

        async function generateVideo() {
            const prompt = document.getElementById('videoPrompt').value.trim();
            const duration = document.getElementById('videoDuration').value;
            const style = document.getElementById('videoStyle').value;

            if (!prompt) {
                alert('Please describe your video');
                return;
            }

            const generateBtn = document.getElementById('generateVideoBtn');
            const loading = document.getElementById('videoLoading');
            const preview = document.getElementById('videoPreview');

            // Show loading state
            generateBtn.disabled = true;
            loading.style.display = 'block';
            preview.style.display = 'none';

            try {
                // Call backend API to generate video
                const response = await fetch(`${API_BASE_URL}/api/ai/generate-video`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        duration: duration,
                        style: style
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                
                // Check the correct response structure
                const videoUrl = data.video?.url || data.videoUrl;
                
                if (data.success && videoUrl) {
                    // Display the generated video
                    const videoElement = document.getElementById('generatedVideo');
                    videoElement.src = videoUrl;
                    preview.style.display = 'block';
                    loading.style.display = 'none';

                    // Store video info for later
                    window.lastGeneratedVideo = {
                        url: videoUrl,
                        prompt: prompt,
                        filename: data.video?.filename,
                        timestamp: new Date().toISOString()
                    };

                    // Add message to chat
                    addMessage(`✨ Video generated! "${prompt}"`, 'assistant');
                } else {
                    throw new Error(data.error || 'Failed to generate video');
                }
            } catch (error) {
                console.error('Video generation error:', error);
                loading.style.display = 'none';
                alert('Error generating video: ' + error.message);
                
                // Add error message to chat
                addMessage('❌ Failed to generate video. Please try again.', 'assistant');
            } finally {
                generateBtn.disabled = false;
            }
        }

        function downloadVideo() {
            if (!window.lastGeneratedVideo) {
                alert('No video to download');
                return;
            }

            const link = document.createElement('a');
            link.href = window.lastGeneratedVideo.url;
            link.download = `video-${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function shareVideo() {
            if (!window.lastGeneratedVideo) {
                alert('No video to share');
                return;
            }

            const shareText = `Check out this AI-generated video: "${window.lastGeneratedVideo.prompt}"`;
            
            if (navigator.share) {
                navigator.share({
                    title: 'AI Generated Video',
                    text: shareText,
                    url: window.location.href
                }).catch(err => console.log('Share cancelled'));
            } else {
                // Fallback: copy to clipboard
                const shareUrl = `${window.location.href}?video=${encodeURIComponent(window.lastGeneratedVideo.url)}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('Video link copied to clipboard!');
                });
            }
        }

        // ==========================================
        // AI PDF GENERATION
        // ==========================================
        async function createAIPdf(customPrompt = null) {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to generate PDF documents.', 'assistant');
                return;
            }

            try {
                const prompt = customPrompt || 'Write a comprehensive paragraph about the Internet of Things (IoT) and its impact on modern technology.';
                
                // Show loading notification with topic
                const topicPreview = customPrompt ? `Topic: "${customPrompt.substring(0, 60)}${customPrompt.length > 60 ? '...' : ''}"` : 'Default topic: IoT';
                const loadingMsg = addMessage(`📄 Generating PDF...\n${topicPreview}\n\n🔄 Please wait while AI creates your content...`, 'assistant');
                
                // Use backend proxy to avoid CORS issues
                const response = await fetch(`${API_BASE_URL}/api/generate-pdf-content`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt })
                });

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('🤖 AI Response:', data);
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to generate content');
                }
                
                const text = data.text;

                // Update loading message
                loadingMsg.querySelector('.message-content').innerHTML = `
                    <div style="font-weight: 600; color: var(--primary-color);">✅ AI content generated successfully!</div>
                    <div style="margin-top: 12px; padding: 14px; background: var(--message-bg); border-radius: 8px; font-size: 13px; line-height: 1.6; border-left: 3px solid var(--primary-color);">
                        <strong>Topic:</strong> ${customPrompt || 'Internet of Things (IoT)'}<br><br>
                        <strong>Preview:</strong><br>
                        ${text.substring(0, 300)}${text.length > 300 ? '...' : ''}
                    </div>
                    <div style="margin-top: 10px; color: var(--text-secondary); font-size: 12px;">
                        📝 Generating PDF document...
                    </div>
                `;

                // Generate PDF using jsPDF
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                
                // Add title
                pdf.setFontSize(18);
                pdf.setFont(undefined, 'bold');
                const title = customPrompt ? customPrompt.substring(0, 50) : 'AI-Generated Document';
                const titleLines = pdf.splitTextToSize(title, 170);
                pdf.text(titleLines, 20, 20);
                
                // Add separator line
                pdf.setLineWidth(0.5);
                pdf.line(20, 28 + (titleLines.length * 7), 190, 28 + (titleLines.length * 7));
                
                // Add timestamp
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'italic');
                pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 35 + (titleLines.length * 7));
                pdf.text(`Source: CopilotX AI Assistant`, 20, 40 + (titleLines.length * 7));
                
                // Add content with text wrapping
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'normal');
                const splitText = pdf.splitTextToSize(text, 170);
                pdf.text(splitText, 20, 50 + (titleLines.length * 7));
                
                // Create PDF blob and URL
                const filename = `${customPrompt ? customPrompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : 'AI-Document'}-${Date.now()}.pdf`;
                const pdfBlob = pdf.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                
                // Store for download
                window.lastGeneratedPdf = { blob: pdfBlob, filename: filename, url: pdfUrl };
                
                // Success message with download and preview buttons
                setTimeout(() => {
                    loadingMsg.querySelector('.message-content').innerHTML = `
                        <div style="font-weight: 600; color: #10b981;">✅ PDF generated successfully!</div>
                        <div style="margin-top: 12px; padding: 12px; background: var(--message-bg); border-radius: 8px; border-left: 3px solid #10b981;">
                            <div style="font-size: 13px; margin-bottom: 10px;"><strong>📄 Filename:</strong> ${filename}</div>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button onclick="(function(){ const a = document.createElement('a'); a.href = '${pdfUrl}'; a.download = '${filename}'; a.click(); })()" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                                    ⬇️ Download PDF
                                </button>
                                <button onclick="window.open('${pdfUrl}', '_blank')" style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                                    🔍 Open in Browser
                                </button>
                            </div>
                        </div>
                    `;
                }, 500);
                
                console.log('✅ PDF created successfully:', filename);
                
            } catch (error) {
                console.error('❌ Error creating AI PDF:', error);
                addMessage(`❌ Failed to generate PDF: ${error.message}. Please check your API key and try again.`, 'assistant');
            }
        }

        // ==========================================
        // AI DOCX GENERATION
        // ==========================================
        async function createAIDocx(customPrompt = null) {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to generate DOCX documents.', 'assistant');
                return;
            }

            try {
                const prompt = customPrompt || 'Write a comprehensive paragraph about the Internet of Things (IoT) and its impact on modern technology.';
                
                // Show loading notification with topic
                const topicPreview = customPrompt ? `Topic: "${customPrompt.substring(0, 60)}${customPrompt.length > 60 ? '...' : ''}"` : 'Default topic: IoT';
                const loadingMsg = addMessage(`📄 Generating DOCX...\n${topicPreview}\n\n🔄 Please wait while AI creates your content...`, 'assistant');
                
                // Use backend proxy to avoid CORS issues
                const response = await fetch(`${API_BASE_URL}/api/generate-pdf-content`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt })
                });

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('🤖 AI Response:', data);
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to generate content');
                }
                
                const text = data.text;

                // Update loading message
                loadingMsg.querySelector('.message-content').innerHTML = `
                    <div style="font-weight: 600; color: var(--primary-color);">✅ AI content generated successfully!</div>
                    <div style="margin-top: 12px; padding: 14px; background: var(--message-bg); border-radius: 8px; font-size: 13px; line-height: 1.6; border-left: 3px solid var(--primary-color);">
                        <strong>Topic:</strong> ${customPrompt || 'Internet of Things (IoT)'}<br><br>
                        <strong>Preview:</strong><br>
                        ${text.substring(0, 300)}${text.length > 300 ? '...' : ''}
                    </div>
                    <div style="margin-top: 10px; color: var(--text-secondary); font-size: 12px;">
                        📝 Generating DOCX document...
                    </div>
                `;

                // Generate DOCX using docx library
                const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
                
                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: [
                            new Paragraph({
                                text: customPrompt || 'AI-Generated Document',
                                heading: HeadingLevel.HEADING_1,
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Generated: ${new Date().toLocaleString()}`,
                                        italics: true,
                                        size: 20,
                                    })
                                ]
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'Source: CopilotX AI Assistant',
                                        italics: true,
                                        size: 20,
                                    })
                                ]
                            }),
                            new Paragraph({ text: '' }), // Empty line
                            new Paragraph({
                                text: text,
                            }),
                        ],
                    }],
                });
                
                // Generate DOCX blob
                const blob = await Packer.toBlob(doc);
                const filename = `${customPrompt ? customPrompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') : 'AI-Document'}-${Date.now()}.docx`;
                
                // Create blob URL
                const docxUrl = URL.createObjectURL(blob);
                
                // Store for download
                window.lastGeneratedDocx = { blob: blob, filename: filename, url: docxUrl };
                
                // Success message with download and preview buttons
                setTimeout(() => {
                    loadingMsg.querySelector('.message-content').innerHTML = `
                        <div style="font-weight: 600; color: #10b981;">✅ DOCX generated successfully!</div>
                        <div style="margin-top: 12px; padding: 12px; background: var(--message-bg); border-radius: 8px; border-left: 3px solid #10b981;">
                            <div style="font-size: 13px; margin-bottom: 10px;"><strong>📄 Filename:</strong> ${filename}</div>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button onclick="previewDocx()" style="padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                                    👁️ Preview
                                </button>
                                <button onclick="saveAs(window.lastGeneratedDocx.blob, window.lastGeneratedDocx.filename)" style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                                    ⬇️ Download
                                </button>
                                <button onclick="window.open('${docxUrl}', '_blank')" style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                                    📥 Open
                                </button>
                            </div>
                        </div>
                    `;
                }, 500);
                
                console.log('✅ DOCX created successfully:', filename);
                
            } catch (error) {
                console.error('❌ Error creating AI DOCX:', error);
                addMessage(`❌ Failed to generate DOCX: ${error.message}. Please try again.`, 'assistant');
            }
        }

        // Generate PDF from chat prompt
        async function generatePdfFromChat() {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to generate PDF documents.', 'assistant');
                return;
            }

            const input = document.getElementById('chatInput');
            const prompt = input.value.trim();
            
            if (!prompt) {
                addMessage('❌ Please enter a prompt for PDF generation.', 'assistant');
                return;
            }
            
            // Clear input
            input.value = '';
            
            // Add user message
            addMessage(prompt, 'user');
            
            // Generate PDF with custom prompt
            await createAIPdf(prompt);
        }

        // Generate DOCX from chat prompt
        async function generateDocxFromChat() {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to generate DOCX documents.', 'assistant');
                return;
            }

            const input = document.getElementById('chatInput');
            const prompt = input.value.trim();
            
            if (!prompt) {
                addMessage('❌ Please enter a prompt for DOCX generation.', 'assistant');
                return;
            }
            
            // Clear input
            input.value = '';
            
            // Add user message
            addMessage(prompt, 'user');
            
            // Generate DOCX with custom prompt
            await createAIDocx(prompt);
        }

        // Generate Podcast from chat prompt
        async function generatePodcastFromChat(topic) {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to generate podcasts.', 'assistant');
                return;
            }

            // Add loading message
            const loadingMsg = addMessage('🎙️ Generating podcast script...', 'assistant');
            
            try {
                // Generate podcast script using AI
                const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        prompt: `Create an engaging podcast script about: ${topic}\n\nRequirements:\n- Create a natural, conversational podcast script\n- Include an engaging introduction\n- Cover key points with interesting details\n- Add natural transitions between topics\n- Include a memorable conclusion\n- Write in a friendly, engaging tone\n- Script should be 2-3 minutes when spoken\n- Use natural speech patterns and pauses\n\nWrite ONLY the script content, no extra formatting or labels.`,
                        conversationHistory: []
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to generate script: ${response.statusText}`);
                }

                const data = await response.json();
                const script = data.reply || data.response || data.message || '';
                
                if (!script) {
                    throw new Error('No script generated');
                }

                // Update loading message
                loadingMsg.innerHTML = formatTextToHtml('🎙️ Script generated! Converting to speech...');

                // Get selected voice (use default if no voice selected)
                const voiceSelect = document.getElementById('podcastVoice');
                const voice = voiceSelect ? voiceSelect.value : 'default';

                // Generate audio using TTS
                const ttsResponse = await fetch(`${API_BASE_URL}/api/ai/text-to-speech`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        text: script,
                        voice: voice
                    })
                });

                if (!ttsResponse.ok) {
                    throw new Error(`Failed to generate audio: ${ttsResponse.statusText}`);
                }

                const audioBlob = await ttsResponse.blob();
                
                // Create download link
                const url = URL.createObjectURL(audioBlob);
                const fileName = `podcast-${topic.substring(0, 30).replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.mp3`;
                
                // Store for later use
                window.lastGeneratedPodcast = {
                    blob: audioBlob,
                    url: url,
                    fileName: fileName,
                    script: script,
                    topic: topic
                };

                // Update message with success and download button
                const successMessage = `✅ Podcast created successfully!\n\n📝 **Script Preview:**\n${script.substring(0, 200)}${script.length > 200 ? '...' : ''}\n\n🎧 Click below to download or play your podcast:`;
                
                const downloadButton = `<div style="margin-top: 12px;">
                    <button onclick="downloadPodcast()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-right: 8px; font-weight: 500;">
                        <i class="fas fa-download"></i> Download Podcast
                    </button>
                    <button onclick="playPodcast()" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        <i class="fas fa-play"></i> Play Audio
                    </button>
                </div>`;
                
                loadingMsg.innerHTML = formatTextToHtml(successMessage) + downloadButton;

            } catch (error) {
                console.error('Error generating podcast from chat:', error);
                loadingMsg.innerHTML = formatTextToHtml(`❌ Error: ${error.message}`);
            }
        }

        // Play podcast audio
        function playPodcast() {
            if (!window.lastGeneratedPodcast || !window.lastGeneratedPodcast.url) {
                alert('No podcast available to play');
                return;
            }

            // Create audio player if it doesn't exist
            let audio = document.getElementById('podcastAudioPlayer');
            if (!audio) {
                audio = document.createElement('audio');
                audio.id = 'podcastAudioPlayer';
                audio.controls = true;
                audio.style.width = '100%';
                audio.style.marginTop = '12px';
                document.body.appendChild(audio);
            }

            // Set source and play
            audio.src = window.lastGeneratedPodcast.url;
            audio.play();
            
            // Add audio player to last message
            const messages = document.querySelectorAll('.message.assistant');
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && !lastMessage.querySelector('#podcastAudioPlayer')) {
                lastMessage.appendChild(audio);
            }
        }

        // Preview DOCX in modal
        async function previewDocx() {
            if (!window.lastGeneratedDocx || !window.lastGeneratedDocx.blob) {
                alert('No DOCX file available to preview');
                return;
            }

            try {
                const modal = document.getElementById('docxPreviewModal');
                const content = document.getElementById('docxPreviewContent');
                
                // Show loading
                content.querySelector('div').innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;"><i class="fas fa-spinner fa-spin" style="font-size: 32px;"></i><div style="margin-top: 16px;">Loading preview...</div></div>';
                modal.style.display = 'block';
                
                // Convert DOCX to HTML using mammoth
                const arrayBuffer = await window.lastGeneratedDocx.blob.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                
                // Create styled HTML with dark text
                const styledHtml = `
                    <style>
                        #docxPreviewContent h1, #docxPreviewContent h2, #docxPreviewContent h3,
                        #docxPreviewContent h4, #docxPreviewContent h5, #docxPreviewContent h6 {
                            color: #111827 !important;
                            font-weight: 700 !important;
                            margin-top: 24px !important;
                            margin-bottom: 16px !important;
                        }
                        #docxPreviewContent h1 { font-size: 32px !important; }
                        #docxPreviewContent h2 { font-size: 24px !important; }
                        #docxPreviewContent h3 { font-size: 20px !important; }
                        #docxPreviewContent p {
                            color: #1f2937 !important;
                            font-size: 16px !important;
                            line-height: 1.8 !important;
                            margin-bottom: 12px !important;
                        }
                        #docxPreviewContent strong, #docxPreviewContent b {
                            color: #111827 !important;
                            font-weight: 600 !important;
                        }
                        #docxPreviewContent em, #docxPreviewContent i {
                            color: #374151 !important;
                        }
                    </style>
                    ${result.value || '<p style="color: #6b7280;">No content to display</p>'}
                `;
                
                // Display converted HTML
                content.querySelector('div').innerHTML = styledHtml;
                
                // Log any messages/warnings
                if (result.messages.length > 0) {
                    console.log('Mammoth conversion messages:', result.messages);
                }
            } catch (error) {
                console.error('Error previewing DOCX:', error);
                alert('Failed to preview DOCX: ' + error.message);
                closeDocxPreview();
            }
        }

        // Close DOCX preview modal
        function closeDocxPreview() {
            const modal = document.getElementById('docxPreviewModal');
            modal.style.display = 'none';
        }

        // ============================================================
        // PODCAST GENERATION
        // ============================================================

        let currentPodcastData = null;

        // Open Podcast Modal
        async function openPodcastModal() {
            // Check if user is authenticated
            if (!currentUser || !localStorage.getItem('authToken')) {
                addMessage('🔒 Please sign in to create podcasts.', 'assistant');
                return;
            }

            const modal = document.getElementById('podcastModal');
            modal.style.display = 'flex';
            
            // Check if server is accessible
            try {
                const healthCheck = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                    method: 'OPTIONS',
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log('✅ Server connection OK');
            } catch (error) {
                console.error('❌ Server connection failed:', error);
                alert('⚠️ Cannot connect to server!\n\nPlease make sure:\n1. Server is running (run: node server.js)\n2. You\'re accessing via http://localhost:3000\n\nSome features (AI script generation) may not work.');
            }
            
            // Reset form
            document.getElementById('podcastTitle').value = '';
            document.getElementById('podcastScript').value = '';
            document.getElementById('podcastCharCount').textContent = '0';
            document.getElementById('podcastVoice').value = 'default';
            document.getElementById('podcastUseAI').checked = true;
            document.getElementById('podcastPreview').style.display = 'none';
            document.getElementById('podcastGenerating').style.display = 'none';
            
            currentPodcastData = null;
        }

        // Close Podcast Modal
        function closePodcastModal() {
            const modal = document.getElementById('podcastModal');
            modal.style.display = 'none';
            
            // Stop any playing audio
            const audio = document.getElementById('generatedPodcast');
            if (audio && !audio.paused) {
                audio.pause();
            }
        }

        // Create New Podcast (reset form but keep modal open)
        function createNewPodcast() {
            document.getElementById('podcastTitle').value = '';
            document.getElementById('podcastScript').value = '';
            document.getElementById('podcastCharCount').textContent = '0';
            document.getElementById('podcastPreview').style.display = 'none';
            currentPodcastData = null;
        }

        // Update character counter for podcast script
        document.getElementById('podcastScript')?.addEventListener('input', function() {
            const charCount = this.value.length;
            document.getElementById('podcastCharCount').textContent = charCount;
        });

        // Generate Podcast
        async function generatePodcast() {
            // Check if user is authenticated (safety check)
            if (!currentUser || !localStorage.getItem('authToken')) {
                alert('🔒 Please sign in to generate podcasts.');
                closePodcastModal();
                return;
            }

            const title = document.getElementById('podcastTitle').value.trim();
            let script = document.getElementById('podcastScript').value.trim();
            const voice = document.getElementById('podcastVoice').value;
            const useAI = document.getElementById('podcastUseAI').checked;

            // Validation
            if (!title) {
                alert('Please enter a podcast title');
                return;
            }

            const generatingDiv = document.getElementById('podcastGenerating');
            const previewDiv = document.getElementById('podcastPreview');
            const generateBtn = document.getElementById('generatePodcastBtn');
            
            try {
                // Show generating state
                generatingDiv.style.display = 'block';
                previewDiv.style.display = 'none';
                generateBtn.disabled = true;
                
                // Step 1: If script is empty or AI generation is requested, generate script with AI
                if ((!script || script.length < 50) && useAI) {
                    document.getElementById('podcastGeneratingText').textContent = 'Generating podcast script with AI...';
                    
                    const scriptPrompt = script || 
                        `Create an engaging podcast script about: ${title}. ` +
                        `Make it informative, conversational, and about 2-3 minutes long when spoken. ` +
                        `Include an introduction, main content, and conclusion.`;

                    console.log('🤖 Requesting AI script generation...', API_BASE_URL);
                    
                    const aiResponse = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                        },
                        body: JSON.stringify({
                            prompt: scriptPrompt,
                            conversationHistory: []
                        })
                    });

                    console.log('📡 AI Response status:', aiResponse.status);

                    if (!aiResponse.ok) {
                        const errorText = await aiResponse.text();
                        console.error('❌ AI API Error:', errorText);
                        throw new Error(`Failed to generate script with AI (${aiResponse.status})`);
                    }

                    const aiData = await aiResponse.json();
                    console.log('✅ AI script generated successfully');
                    script = aiData.reply || aiData.message || script;
                    
                    // Update the textarea with generated script
                    document.getElementById('podcastScript').value = script;
                    document.getElementById('podcastCharCount').textContent = script.length;
                }

                // Step 2: Convert script to speech
                document.getElementById('podcastGeneratingText').textContent = 'Converting to speech...';
                
                const ttsResponse = await fetch(`${API_BASE_URL}/api/ai/text-to-speech`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                    },
                    body: JSON.stringify({
                        text: script,
                        voice: voice
                    })
                });

                // Check if TTS failed due to Python environment
                if (!ttsResponse.ok) {
                    const errorData = await ttsResponse.json();
                    
                    // If Python environment error, offer browser-based TTS as fallback
                    const PYTHON_ENV_ERROR = 'Python environment not found';
                    if (errorData.error === PYTHON_ENV_ERROR && 'speechSynthesis' in window) {
                        console.warn('⚠️ Server TTS not available, using browser speech synthesis as fallback');
                        
                        // Use browser's speech synthesis
                        const useBrowserTTS = confirm(
                            '⚠️ Server-based podcast generation is not available (Python environment not set up).\n\n' +
                            'Would you like to use your browser\'s built-in text-to-speech instead?\n\n' +
                            'Note: Browser TTS cannot be downloaded as an audio file, but you can listen to it.'
                        );
                        
                        if (useBrowserTTS) {
                            // Use browser speech synthesis
                            if (window.speechSynthesis) {
                                speechSynthesis.cancel();
                                
                                const utterance = new SpeechSynthesisUtterance(script);
                                utterance.rate = 0.9;
                                utterance.pitch = 1.0;
                                
                                // Set voice based on selection with multiple fallback options
                                const voices = speechSynthesis.getVoices();
                                if (voices.length > 0) {
                                    let selectedVoice = voices[0]; // Default fallback
                                    
                                    if (voice === 'male') {
                                        selectedVoice = voices.find(v => 
                                            v.name.toLowerCase().includes('male') || 
                                            v.name.includes('David') ||
                                            v.name.includes('Guy') ||
                                            v.gender === 'male'
                                        ) || voices[0];
                                    } else if (voice === 'female') {
                                        selectedVoice = voices.find(v => 
                                            v.name.toLowerCase().includes('female') || 
                                            v.name.includes('Samantha') ||
                                            v.name.includes('Ava') ||
                                            v.gender === 'female'
                                        ) || voices[0];
                                    }
                                    
                                    utterance.voice = selectedVoice;
                                }
                                
                                speechSynthesis.speak(utterance);
                                
                                generatingDiv.style.display = 'none';
                                alert('🔊 Playing podcast using browser text-to-speech.\n\nNote: To download podcasts, please set up the Python environment as described in the setup documentation.');
                                closePodcastModal();
                                return;
                            }
                        } else {
                            generatingDiv.style.display = 'none';
                            const setupInstructions = errorData.instructions || 'See PODCAST-FEATURE.md for setup instructions';
                            alert('❌ Podcast generation cancelled.\n\nTo enable full podcast features, please set up the Python environment:\n' + setupInstructions);
                            generateBtn.disabled = false;
                            return;
                        }
                    }
                    
                    throw new Error(errorData.error || errorData.message || 'Failed to generate podcast audio');
                }

                // Get audio blob
                const audioBlob = await ttsResponse.blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                // Store podcast data
                currentPodcastData = {
                    title: title,
                    script: script,
                    voice: voice,
                    audioUrl: audioUrl,
                    audioBlob: audioBlob,
                    timestamp: new Date().toISOString()
                };

                // Display audio player
                const audioElement = document.getElementById('generatedPodcast');
                audioElement.src = audioUrl;
                
                generatingDiv.style.display = 'none';
                previewDiv.style.display = 'block';

                // Add success message to chat
                addMessage('assistant', `✅ Podcast "${title}" has been generated successfully! You can play, download, or share it using the controls in the modal.`);

            } catch (error) {
                console.error('Error generating podcast:', error);
                
                // Provide more helpful error message
                let errorMessage = 'Failed to generate podcast: ' + error.message;
                
                if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
                    errorMessage += '\n\n⚠️ Make sure:\n' +
                        '1. The server is running (npm start or node server.js)\n' +
                        '2. You\'re accessing via http://localhost:3000\n' +
                        '3. The backend API routes are configured correctly';
                }
                
                alert(errorMessage);
                generatingDiv.style.display = 'none';
            } finally {
                generateBtn.disabled = false;
            }
        }

        // Download Podcast
        function downloadPodcast() {
            // Check both podcast sources: modal (currentPodcastData) and chat (window.lastGeneratedPodcast)
            const podcastData = currentPodcastData || window.lastGeneratedPodcast;
            
            if (!podcastData) {
                alert('No podcast to download');
                return;
            }

            const link = document.createElement('a');
            
            // Handle different data structures
            if (podcastData.audioUrl) {
                // From modal
                link.href = podcastData.audioUrl;
                link.download = `${podcastData.title.replace(/[^a-z0-9]/gi, '_')}_podcast.mp3`;
            } else if (podcastData.url) {
                // From chat
                link.href = podcastData.url;
                link.download = podcastData.fileName || `podcast_${Date.now()}.mp3`;
            } else {
                alert('Unable to download podcast - invalid data');
                return;
            }
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            const title = podcastData.title || podcastData.topic || 'Podcast';
            addMessage('assistant', `📥 Podcast "${title}" downloaded successfully!`);
        }

        // Share Podcast
        async function sharePodcast() {
            // Check both podcast sources: modal (currentPodcastData) and chat (window.lastGeneratedPodcast)
            const podcastData = currentPodcastData || window.lastGeneratedPodcast;
            
            if (!podcastData) {
                alert('No podcast to share');
                return;
            }

            // Get blob and title based on data structure
            let audioBlob, title, fileName;
            
            if (podcastData.audioBlob) {
                // From modal
                audioBlob = podcastData.audioBlob;
                title = podcastData.title;
                fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_podcast.mp3`;
            } else if (podcastData.blob) {
                // From chat
                audioBlob = podcastData.blob;
                title = podcastData.topic || 'Podcast';
                fileName = podcastData.fileName || `${title.replace(/[^a-z0-9]/gi, '_')}_podcast.mp3`;
            } else {
                alert('Unable to share podcast - invalid data');
                return;
            }

            const podcastFile = new File(
                [audioBlob], 
                fileName,
                { type: 'audio/mpeg' }
            );

            const shareData = {
                title: title,
                text: `Check out my podcast: ${title}`,
                files: [podcastFile]
            };

            try {
                if (navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                    addMessage('assistant', `📤 Podcast shared successfully!`);
                } else {
                    // Fallback: Copy link to clipboard
                    const shareText = `Check out my podcast: ${title}`;
                    await navigator.clipboard.writeText(shareText);
                    alert('Podcast info copied to clipboard! (Note: Direct file sharing not supported on this device)');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing podcast:', error);
                    alert('Failed to share podcast: ' + error.message);
                }
            }
        }

        // Expose video functions globally
        window.showVideoModal = showVideoModal;
        window.closeVideoModal = closeVideoModal;
        window.generateVideo = generateVideo;
        window.downloadVideo = downloadVideo;
        window.shareVideo = shareVideo;
        window.selectAction = selectAction;
        window.createAIPdf = createAIPdf;
        window.generatePdfFromChat = generatePdfFromChat;
        window.createAIDocx = createAIDocx;
        window.generateDocxFromChat = generateDocxFromChat;
        window.previewDocx = previewDocx;
        window.closeDocxPreview = closeDocxPreview;
        
        // Expose podcast functions globally
        window.openPodcastModal = openPodcastModal;
        window.closePodcastModal = closePodcastModal;
        window.generatePodcast = generatePodcast;
        window.downloadPodcast = downloadPodcast;
        window.sharePodcast = sharePodcast;
        window.createNewPodcast = createNewPodcast;

        console.log('✅ Copilot script loaded successfully - all functions exposed to window');
