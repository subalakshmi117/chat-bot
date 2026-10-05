// Store conversation history
const chatHistory = [];

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Add a message bubble to the chat container
function addMessage(role, text, isError = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role} ${isError ? 'error' : ''}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'bubble';
  bubbleDiv.textContent = text;

  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// Show the typing indicator
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai';
  typingDiv.id = 'typing-indicator';

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'bubble typing-dots';
  bubbleDiv.innerHTML = '<span></span><span></span><span></span>';

  typingDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(typingDiv);
  scrollToBottom();
}

// Remove the typing indicator
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Automatically scroll to the latest message
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle sending a chat message
async function handleChatSubmit(e) {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  // Add user message to UI and history
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  // Reset and disable input while waiting
  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;

  // Display typing indicator
  showTypingIndicator();

  try {
    // Send full conversation history to server
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (!response.ok) {
      // Display server error message in chat
      addMessage('ai', data.error || 'Sorry, something went wrong. Please try again.', true);
      return;
    }

    // Add model reply to UI and history
    addMessage('ai', data.reply);
    chatHistory.push({ role: 'assistant', content: data.reply });
  } catch (error) {
    // Handle network failures
    removeTypingIndicator();
    addMessage('ai', 'Network error: Unable to connect to the server.', true);
  } finally {
    // Re-enable input controls
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// Listen for form submission (button click or Enter key)
chatForm.addEventListener('submit', handleChatSubmit);
