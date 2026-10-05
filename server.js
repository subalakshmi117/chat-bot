const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS headers for ONNX WASM & model loading
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
    res.header('Cross-Origin-Opener-Policy', 'same-origin');
    next();
});

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Fallback to index.html for any route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SubAI Local AI Chatbot Server is active!`);
    console.log(`🌐 Open http://localhost:${PORT} in your web browser`);
    console.log(`🔒 100% Client-side Browser AI (No API Key Required)`);
    console.log(`====================================================`);
});
