/**
 * SubAI LocalStorage State Manager
 * Handles persistence of chat sessions, active threads, and model configurations.
 */

const STORAGE_KEYS = {
    CHATS: 'subai_chats_v1',
    ACTIVE_CHAT_ID: 'subai_active_chat_id_v1',
    SELECTED_MODEL: 'subai_selected_model_v1'
};

const StorageManager = {
    /**
     * Fetch all stored chat sessions
     */
    getChats() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CHATS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading chats from localStorage:', e);
            return [];
        }
    },

    /**
     * Get a specific chat by ID
     */
    getChatById(id) {
        const chats = this.getChats();
        return chats.find(c => c.id === id) || null;
    },

    /**
     * Save or update a chat session
     */
    saveChat(chat) {
        const chats = this.getChats();
        const existingIndex = chats.findIndex(c => c.id === chat.id);
        
        if (existingIndex >= 0) {
            chats[existingIndex] = chat;
        } else {
            chats.unshift(chat);
        }

        try {
            localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
        } catch (e) {
            console.error('Error saving chat to localStorage:', e);
        }
    },

    /**
     * Create a brand new chat session
     */
    createNewChat() {
        const newChat = {
            id: 'chat_' + Date.now(),
            title: 'New Chat',
            createdAt: new Date().toISOString(),
            messages: []
        };
        this.saveChat(newChat);
        this.setActiveChatId(newChat.id);
        return newChat;
    },

    /**
     * Delete a chat session
     */
    deleteChat(id) {
        let chats = this.getChats();
        chats = chats.filter(c => c.id !== id);
        
        try {
            localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
        } catch (e) {
            console.error('Error deleting chat from localStorage:', e);
        }

        if (this.getActiveChatId() === id) {
            if (chats.length > 0) {
                this.setActiveChatId(chats[0].id);
            } else {
                const newChat = this.createNewChat();
                return newChat.id;
            }
        }
        return this.getActiveChatId();
    },

    /**
     * Clear all stored history
     */
    clearAllChats() {
        try {
            localStorage.removeItem(STORAGE_KEYS.CHATS);
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT_ID);
        } catch (e) {
            console.error('Error clearing localStorage:', e);
        }
        return this.createNewChat();
    },

    /**
     * Get active chat ID
     */
    getActiveChatId() {
        return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT_ID) || null;
    },

    /**
     * Set active chat ID
     */
    setActiveChatId(id) {
        try {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT_ID, id);
        } catch (e) {
            console.error('Error saving active chat ID:', e);
        }
    },

    /**
     * Get selected model ID
     */
    getSelectedModel() {
        return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) || 'Xenova/LaMini-Flan-T5-77M';
    },

    /**
     * Set selected model ID
     */
    setSelectedModel(modelId) {
        try {
            localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelId);
        } catch (e) {
            console.error('Error setting selected model:', e);
        }
    }
};

window.StorageManager = StorageManager;
