# SubAI - 100% Local Browser AI Chatbot

SubAI is a completely local, privacy-first AI chatbot website. It runs open-weight AI models locally inside your web browser using **Hugging Face Transformers.js (ONNX WebAssembly & WebGPU)**.

## ✨ Features
- 🔒 **100% Local Browser AI**: Zero server backend required.
- 🔑 **Zero API Keys**: No OpenAI, Gemini, Claude, or paid cloud APIs needed.
- 🦥 **No Ollama / No Backend Software Needed**: Runs directly in modern web browsers.
- 📥 **IndexedDB Caching**: Downloads model weights once (~150MB) and reuses cached weights for instant subsequent launches.
- 💬 **ChatGPT UI**: Sidebar with thread history, "+ New Chat", model switcher, code formatting with copy buttons, streaming typing output animation, and `localStorage` persistence.

## 🚀 How to Run

### Option 1: Direct Browser Launch
Open `index.html` directly in Chrome, Edge, Firefox, Brave, or Safari.

### Option 2: Run via Local Server
Run a static HTTP server in the project directory:
```bash
node server.js
```
Then open `http://localhost:3000` in your web browser.

## 🛠️ Built With
- HTML5, CSS3 (Vanilla Design System)
- JavaScript (ES Modules)
- Hugging Face Transformers.js (`@xenova/transformers`)
- WebAssembly (ONNX Runtime Web)
