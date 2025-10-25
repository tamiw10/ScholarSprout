require('dotenv').config()
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors')

// --- 🔑 SECURITY: Set your API Key securely here! ---
// NOTE: For testing, you can temporarily hardcode your key here:
// const OPENAI_API_KEY = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; 
const OPENAI_API_KEY = process.env.API_KEY; 

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;          

// --- SERVER CONFIGURATION ---

app.use(cors({
    origin: '*',
    methods: ["POST", "GET"]
}))
// 1. Middleware for handling JSON requests
app.use(bodyParser.json()); 

// 2. Middleware for serving static files (like your newhacks.html).
// Since you are using http-server separately, you may not need this, but it's good practice:
// app.use(express.static(__dirname));

// --- 🌐 AI PROXY ROUTE ---
app.post('/api/chat', async (req, res) => {
    try {
        // Ensure the fetch function is available (Node.js >= 18)
        if (typeof fetch === 'undefined') {
            throw new Error('Native fetch is not available. Use Node.js 18+ or install node-fetch.');
        }
        
        const externalApiUrl = 'https://openrouter.ai/api/v1/chat/completions';

        // 1. Forward the request to the external API
        const response = await fetch(externalApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Check if the API Key is set before using it
                'Authorization': `Bearer ${OPENAI_API_KEY}` 
            },
            body: JSON.stringify(req.body) 
        });

        // Handle non-200 responses from the external API (e.g., 401 for bad key)
        if (!response.ok) {
            const errorData = await response.json();
            console.error('External API Error:', errorData);
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();

        // 2. Return the external API's response directly to the client
        res.json(data);

    } catch (error) {
        console.error('Proxy Server Error:', error);
        res.status(500).json({ error: 'Internal server error while fetching chat completion.', details: error.message });
    }
});
// --- END PROXY ROUTE ---


// --- OPTIONAL: Socket.io connection (If you plan to use real-time chat later) ---
io.on('connection', (socket) => {
    console.log('A user connected via Socket.io');
    // You can put any real-time logic here
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
// ---------------------------------------------------------------------------------


// --- START THE SERVER ---
server.listen(PORT, () => {
    // This is the line that prints the confirmation message!
    console.log(`Chatbot Proxy Server running at http://localhost:${PORT}`);
});