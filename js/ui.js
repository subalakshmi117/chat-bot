/**
 * SubAI UI Controller
 * Manages chat rendering, sidebar interactions, streaming text output, progress bars, and markdown formatting.
 */

export class UIController {
    constructor() {
        // DOM Elements
        this.sidebar = document.getElementById('sidebar');
        this.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        this.historyList = document.getElementById('historyList');
        this.btnNewChat = document.getElementById('btnNewChat');
        this.btnClearHistory = document.getElementById('btnClearHistory');
        this.modelSelect = document.getElementById('modelSelect');

        this.chatTitle = document.getElementById('chatTitle');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusBadgeText = document.getElementById('statusBadgeText');

        this.loadingBanner = document.getElementById('loadingBanner');
        this.bannerText = document.getElementById('bannerText');
        this.progressBarFill = document.getElementById('progressBarFill');

        this.errorBanner = document.getElementById('errorBanner');
        this.errorBannerText = document.getElementById('errorBannerText');
        this.retryLoadBtn = document.getElementById('retryLoadBtn');

        this.messagesContainer = document.getElementById('messagesContainer');
        this.welcomeScreen = document.getElementById('welcomeScreen');

        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
    }

    /**
     * Update Status Badge in Top Header
     */
    setStatus(state, text) {
        this.statusIndicator.className = `status-indicator ${state}`;
        this.statusBadgeText.innerText = text;
    }

    /**
     * Show / Update Progress Banner
     */
    updateProgress(percent, text) {
        this.loadingBanner.style.display = 'flex';
        this.bannerText.innerText = text || `Loading AI model... ${percent}%`;
        this.progressBarFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;

        if (percent >= 100) {
            setTimeout(() => {
                this.loadingBanner.style.display = 'none';
            }, 1200);
        }
    }

    /**
     * Hide Progress Banner
     */
    hideProgress() {
        this.loadingBanner.style.display = 'none';
    }

    /**
     * Show Error Banner
     */
    showError(message) {
        this.errorBanner.style.display = 'flex';
        this.errorBannerText.innerText = message;
    }

    /**
     * Hide Error Banner
     */
    hideError() {
        this.errorBanner.style.display = 'none';
    }

    /**
     * Render Sidebar History Items
     */
    renderSidebarHistory(chats, activeChatId, onSelectChat, onDeleteChat) {
        this.historyList.innerHTML = '';

        if (!chats || chats.length === 0) {
            const emptyLabel = document.createElement('div');
            emptyLabel.className = 'history-title';
            emptyLabel.innerText = 'No conversations yet';
            this.historyList.appendChild(emptyLabel);
            return;
        }

        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `history-item ${chat.id === activeChatId ? 'active' : ''}`;
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-item-text';
            titleSpan.innerText = chat.title || 'New Chat';
            titleSpan.onclick = () => onSelectChat(chat.id);

            const delBtn = document.createElement('button');
            delBtn.className = 'history-del-btn';
            delBtn.innerHTML = '🗑️';
            delBtn.title = 'Delete Chat';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
            };

            item.appendChild(titleSpan);
            item.appendChild(delBtn);
            this.historyList.appendChild(item);
        });
    }

    /**
     * Render Chat Session Messages in Main Container
     */
    renderMessages(chat) {
        this.messagesContainer.innerHTML = '';

        if (!chat || !chat.messages || chat.messages.length === 0) {
            if (this.welcomeScreen) {
                this.welcomeScreen.style.display = 'flex';
                this.messagesContainer.appendChild(this.welcomeScreen);
            }
            this.chatTitle.innerText = 'New Chat';
            return;
        }

        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = 'none';
        }

        this.chatTitle.innerText = chat.title || 'SubAI Chat';

        chat.messages.forEach(msg => {
            this.appendMessageBubble(msg.role, msg.content, false);
        });

        this.scrollToBottom();
    }

    /**
     * Append Single Message Bubble
     */
    appendMessageBubble(role, content, animate = false) {
        if (this.welcomeScreen && this.welcomeScreen.parentElement === this.messagesContainer) {
            this.welcomeScreen.remove();
        }

        const row = document.createElement('div');
        row.className = `message-row ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerText = role === 'user' ? 'U' : 'S';

        const bubble = document.createElement('div');
        bubble.className = 'message-content';
        bubble.innerHTML = this.formatMarkdown(content);

        row.appendChild(avatar);
        row.appendChild(bubble);
        this.messagesContainer.appendChild(row);

        if (animate) {
            this.scrollToBottom();
        }

        return bubble;
    }

    /**
     * Append Typing Dots Indicator
     */
    appendTypingIndicator() {
        const id = 'typing-' + Date.now();
        const row = document.createElement('div');
        row.className = 'message-row assistant';
        row.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerText = 'S';

        const bubble = document.createElement('div');
        bubble.className = 'message-content';
        bubble.innerHTML = `
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        row.appendChild(avatar);
        row.appendChild(bubble);
        this.messagesContainer.appendChild(row);
        this.scrollToBottom();
        return id;
    }

    /**
     * Remove Element by ID
     */
    removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    /**
     * Stream response typing animation character by character
     */
    async streamText(bubbleElement, fullText, onComplete) {
        let index = 0;
        const speed = 15;
        const chunkSize = 3;

        const interval = setInterval(() => {
            index += chunkSize;
            if (index >= fullText.length) {
                bubbleElement.innerHTML = this.formatMarkdown(fullText);
                clearInterval(interval);
                this.scrollToBottom();
                if (onComplete) onComplete();
            } else {
                bubbleElement.innerHTML = this.formatMarkdown(fullText.substring(0, index) + " ▌");
                this.scrollToBottom();
            }
        }, speed);
    }

    /**
     * Convert text with simple Markdown rules to HTML
     */
    formatMarkdown(text) {
        if (!text) return '';
        let safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Code blocks ```lang ... ```
        safe = safe.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'code';
            return `
                <div class="code-block-wrapper">
                    <div class="code-header">
                        <span>${language}</span>
                        <button class="copy-code-btn" onclick="SubAIApp.copyToClipboard(this)">Copy code</button>
                    </div>
                    <pre><code>${code.trim()}</code></pre>
                </div>
            `;
        });

        // Inline code `code`
        safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold **text**
        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic *text*
        safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Bullet lists
        safe = safe.replace(/^\s*[-•]\s+(.*)$/gim, '• $1');

        // Line breaks
        return safe.replace(/\n/g, '<br>');
    }

    /**
     * Scroll messages view to bottom
     */
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * Auto resize textarea height based on content
     */
    autoResizeTextarea() {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(this.userInput.scrollHeight, 140) + 'px';
    }

    /**
     * Toggle Mobile Sidebar Drawer
     */
    toggleSidebar() {
        this.sidebar.classList.toggle('open');
    }
}

window.UIController = UIController;
