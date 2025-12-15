// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = null;

// API Helper Functions
const apiRequest = async (endpoint, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Authentication API
const AuthAPI = {
    register: async (username, email, password) => {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        if (data.token) {
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data;
    },

    login: async (email, password) => {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (data.token) {
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data;
    },

    logout: () => {
        authToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    },

    verify: async () => {
        return await apiRequest('/auth/verify');
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: () => {
        return !!authToken || !!localStorage.getItem('authToken');
    }
};

// Conversations API
const ConversationsAPI = {
    getAll: async () => {
        return await apiRequest('/conversations');
    },

    create: async (title = 'New Chat') => {
        return await apiRequest('/conversations', {
            method: 'POST',
            body: JSON.stringify({ title })
        });
    },

    get: async (id) => {
        return await apiRequest(`/conversations/${id}`);
    },

    update: async (id, updates) => {
        return await apiRequest(`/conversations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    delete: async (id) => {
        return await apiRequest(`/conversations/${id}`, {
            method: 'DELETE'
        });
    },

    export: async (id) => {
        return await apiRequest(`/conversations/${id}/export`);
    },

    generateTitle: async (id) => {
        return await apiRequest(`/conversations/${id}/generate-title`, {
            method: 'POST'
        });
    }
};

// Messages API
const MessagesAPI = {
    send: async (conversationId, content, responseType = 'balanced') => {
        return await apiRequest('/messages', {
            method: 'POST',
            body: JSON.stringify({ conversationId, content, responseType })
        });
    },

    getByConversation: async (conversationId) => {
        return await apiRequest(`/conversations/${conversationId}/messages`);
    },

    update: async (id, content) => {
        return await apiRequest(`/messages/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
    },

    delete: async (id) => {
        return await apiRequest(`/messages/${id}`, {
            method: 'DELETE'
        });
    },

    addReaction: async (id, type) => {
        return await apiRequest(`/messages/${id}/reactions`, {
            method: 'POST',
            body: JSON.stringify({ type })
        });
    },

    regenerate: async (id, responseType = 'balanced') => {
        return await apiRequest(`/messages/${id}/regenerate`, {
            method: 'POST',
            body: JSON.stringify({ responseType })
        });
    }
};

// Settings API
const SettingsAPI = {
    get: async () => {
        return await apiRequest('/settings');
    },

    update: async (settings) => {
        return await apiRequest('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }
};

// Search API
const SearchAPI = {
    search: async (query) => {
        return await apiRequest(`/search?q=${encodeURIComponent(query)}`);
    }
};

// Analytics API
const AnalyticsAPI = {
    get: async () => {
        return await apiRequest('/analytics');
    }
};

// Upload API
const UploadAPI = {
    upload: async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    const data = await apiRequest('/upload', {
                        method: 'POST',
                        body: JSON.stringify({
                            file: reader.result,
                            filename: file.name,
                            type: file.type
                        })
                    });
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }
};

// Initialize auth token from localStorage
if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('authToken');
}

// Export all APIs
const API = {
    Auth: AuthAPI,
    Conversations: ConversationsAPI,
    Messages: MessagesAPI,
    Settings: SettingsAPI,
    Search: SearchAPI,
    Analytics: AnalyticsAPI,
    Upload: UploadAPI
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.API = API;
}

// Example usage:
/*
// Register
await API.Auth.register('username', 'email@example.com', 'password');

// Login
await API.Auth.login('email@example.com', 'password');

// Create conversation
const conversation = await API.Conversations.create('My Chat');

// Send message
const result = await API.Messages.send(conversation.id, 'Hello!', 'balanced');

// Get all conversations
const conversations = await API.Conversations.getAll();

// Search
const results = await API.Search.search('my query');

// Update settings
await API.Settings.update({ theme: 'dark', responseType: 'detailed' });
*/
