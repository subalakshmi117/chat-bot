/**
 * SubAI Main Application Controller
 * Connects storage, AI model engine, and UI controller.
 */

import { LocalAIEngine } from './model.js';
import { UIController } from './ui.js';

class SubAIApplication {
    constructor() {
        this.storage = window.StorageManager;
        this.ui = new UIController();
        this.aiEngine = new LocalAIEngine();

        this.currentChat = null;
        this.isGenerating = false;
    }

    /**
     * Application Initialization Entry Point
     */
    async init() {
        this.bindEvents();

        // 1. Load or Initialize Active Chat Session
        const chats = this.storage.getChats();
        let activeId = this.storage.getActiveChatId();

        if (!activeId || !chats.some(c => c.id === activeId)) {
            if (chats.length > 0) {
                activeId = chats[0].id;
                this.storage.setActiveChatId(activeId);
            } else {
                const newChat = this.storage.createNewChat();
                activeId = newChat.id;
            }
        }

        this.currentChat = this.storage.getChatById(activeId);
        this.refreshSidebar();
        this.ui.renderMessages(this.currentChat);

        // 2. Load Selected AI Model in Browser WASM/WebGPU
        const selectedModel = this.storage.getSelectedModel();
        if (this.ui.modelSelect) {
            this.ui.modelSelect.value = selectedModel;
        }

        await this.loadModelEngine(selectedModel);
    }

    /**
     * Load / Switch AI Engine Model
     */
    async loadModelEngine(modelId) {
        this.ui.hideError();
        this.ui.setStatus('loading', 'Loading AI model...');

        try {
            await this.aiEngine.loadModel(
                modelId,
                (progressInfo) => {
                    this.ui.updateProgress(progressInfo.percent, progressInfo.statusText);
                    this.ui.setStatus('loading', `Loading AI model... ${progressInfo.percent}%`);
                },
                (statusState, statusText) => {
                    this.ui.setStatus(statusState, statusText);
                }
            );

            this.ui.hideProgress();
            this.ui.setStatus('ready', 'Runs 100% locally in browser');
        } catch (err) {
            console.error('Error initializing browser AI model:', err);
            this.ui.hideProgress();
            this.ui.setStatus('error', 'Model Load Error');
            this.ui.showError(`Could not load local AI model (${modelId}). Make sure you are connected to the internet for initial download.`);
        }
    }

    /**
     * Bind DOM Event Listeners
     */
    bindEvents() {
        // Send Button Click
        this.ui.sendBtn.onclick = () => this.handleSendMessage();

        // User Input Keypress (Enter to send, Shift+Enter for newline)
        this.ui.userInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        };

        // Textarea Auto-resize
        this.ui.userInput.oninput = () => this.ui.autoResizeTextarea();

        // Sidebar New Chat Button
        this.ui.btnNewChat.onclick = () => this.handleNewChat();

        // Clear All History Button
        this.ui.btnClearHistory.onclick = () => this.handleClearAllHistory();

        // Toggle Mobile Sidebar Drawer
        if (this.ui.toggleSidebarBtn) {
            this.ui.toggleSidebarBtn.onclick = () => this.ui.toggleSidebar();
        }

        // Retry Load Model Button
        if (this.ui.retryLoadBtn) {
            this.ui.retryLoadBtn.onclick = () => {
                const modelId = this.storage.getSelectedModel();
                this.loadModelEngine(modelId);
            };
        }

        // Model Selector Dropdown Change
        if (this.ui.modelSelect) {
            this.ui.modelSelect.onchange = (e) => {
                const newModel = e.target.value;
                this.storage.setSelectedModel(newModel);
                this.loadModelEngine(newModel);
            };
        }
    }

    /**
     * Handle User Sending a Message
     */
    async handleSendMessage() {
        const text = this.ui.userInput.value.trim();
        if (!text || this.isGenerating) return;

        if (!this.aiEngine.isReady) {
            alert('AI model is still loading into your browser. Please wait a moment until loading completes.');
            return;
        }

        // Reset Input State
        this.ui.userInput.value = '';
        this.ui.userInput.style.height = '26px';
        this.isGenerating = true;
        this.ui.sendBtn.disabled = true;

        // 1. Create or Update Active Chat Session
        if (!this.currentChat) {
            this.currentChat = this.storage.createNewChat();
        }

        // Set Title if first user message
        if (this.currentChat.messages.length === 0) {
            this.currentChat.title = text.length > 28 ? text.substring(0, 28) + '...' : text;
        }

        // Add User Message
        const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
        this.currentChat.messages.push(userMsg);
        this.storage.saveChat(this.currentChat);

        // Render User Message & Update Sidebar
        this.ui.renderMessages(this.currentChat);
        this.refreshSidebar();

        // 2. Add Typing Indicator
        const typingId = this.ui.appendTypingIndicator();

        // 3. Perform Local Browser AI Inference
        try {
            const replyText = await this.aiEngine.generateResponse(text);
            
            // Remove Typing Indicator
            this.ui.removeElement(typingId);

            // Add Assistant Message to State
            const aiMsg = { role: 'assistant', content: replyText, timestamp: new Date().toISOString() };
            this.currentChat.messages.push(aiMsg);
            this.storage.saveChat(this.currentChat);

            // Append Assistant Message Bubble & Stream Output Animation
            const bubbleEl = this.ui.appendMessageBubble('assistant', '', true);
            await this.ui.streamText(bubbleEl, replyText, () => {
                this.isGenerating = false;
                this.ui.sendBtn.disabled = false;
                this.ui.userInput.focus();
            });

        } catch (error) {
            console.error('Error generating local response:', error);
            this.ui.removeElement(typingId);
            
            const errorMsg = "⚠️ SubAI encountered an error while processing your request locally in the browser. Please try rephrasing your question or reload the model.";
            this.ui.appendMessageBubble('assistant', errorMsg, true);

            this.isGenerating = false;
            this.ui.sendBtn.disabled = false;
        }
    }

    /**
     * Start a New Chat Session
     */
    handleNewChat() {
        if (this.isGenerating) return;
        const newChat = this.storage.createNewChat();
        this.currentChat = newChat;
        this.refreshSidebar();
        this.ui.renderMessages(this.currentChat);
        this.ui.userInput.focus();
    }

    /**
     * Switch Active Chat Session
     */
    handleSelectChat(chatId) {
        if (this.isGenerating) return;
        this.storage.setActiveChatId(chatId);
        this.currentChat = this.storage.getChatById(chatId);
        this.refreshSidebar();
        this.ui.renderMessages(this.currentChat);
    }

    /**
     * Delete a Chat Session
     */
    handleDeleteChat(chatId) {
        if (this.isGenerating) return;
        const newActiveId = this.storage.deleteChat(chatId);
        this.currentChat = this.storage.getChatById(newActiveId);
        this.refreshSidebar();
        this.ui.renderMessages(this.currentChat);
    }

    /**
     * Clear All Saved History
     */
    handleClearAllHistory() {
        if (confirm('Are you sure you want to delete all chat history?')) {
            const newChat = this.storage.clearAllChats();
            this.currentChat = newChat;
            this.refreshSidebar();
            this.ui.renderMessages(this.currentChat);
        }
    }

    /**
     * Refresh Sidebar Chat Items List
     */
    refreshSidebar() {
        const chats = this.storage.getChats();
        const activeId = this.storage.getActiveChatId();
        this.ui.renderSidebarHistory(
            chats,
            activeId,
            (id) => this.handleSelectChat(id),
            (id) => this.handleDeleteChat(id)
        );
    }

    /**
     * Fill Textarea from Suggestion Cards
     */
    useSuggestion(text) {
        this.ui.userInput.value = text;
        this.handleSendMessage();
    }

    /**
     * Copy code snippet to user's clipboard
     */
    copyToClipboard(button) {
        const wrapper = button.closest('.code-block-wrapper');
        const code = wrapper ? wrapper.querySelector('code').innerText : '';
        if (code) {
            navigator.clipboard.writeText(code).then(() => {
                const originalText = button.innerText;
                button.innerText = 'Copied!';
                setTimeout(() => button.innerText = originalText, 2000);
            });
        }
    }
}

// Instantiate and expose globally
window.SubAIApp = new SubAIApplication();

// Auto launch application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.SubAIApp.init();
});
