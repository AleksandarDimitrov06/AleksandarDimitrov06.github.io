/**
 * Simple WebRTC signaling server for Chess game
 * 
 * This server handles only the initial connection setup between peers.
 * Once peers are connected, they communicate directly via WebRTC.
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Use JSON middleware
app.use(express.json());

// Enable CORS for all origins
app.use(cors());

// Store active games and their signaling data
const activeGames = {};
const pendingIceCandidates = {};

// Register a new game
app.post('/register', (req, res) => {
    const { gameId, sdp } = req.body;
    
    if (!gameId || !sdp) {
        return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
    
    if (activeGames[gameId]) {
        return res.status(409).json({ success: false, message: 'Game ID already exists' });
    }
    
    // Store the game offer
    activeGames[gameId] = {
        offer: sdp,
        answer: null,
        created: Date.now()
    };
    
    // Initialize empty array for ICE candidates
    pendingIceCandidates[gameId] = [];
    
    console.log(`Game registered: ${gameId}`);
    res.json({ success: true, gameId });
    
    // Clean up old games every 24 hours
    setTimeout(() => {
        if (activeGames[gameId]) {
            delete activeGames[gameId];
            delete pendingIceCandidates[gameId];
            console.log(`Cleaned up inactive game: ${gameId}`);
        }
    }, 24 * 60 * 60 * 1000);
});

// Join an existing game
app.get('/join/:gameId', (req, res) => {
    const { gameId } = req.params;
    
    if (!activeGames[gameId]) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }
    
    // Return the game offer
    res.json({
        success: true,
        sdp: activeGames[gameId].offer
    });
});

// Submit an answer to an offer
app.post('/answer', (req, res) => {
    const { gameId, sdp } = req.body;
    
    if (!gameId || !sdp) {
        return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
    
    if (!activeGames[gameId]) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }
    
    // Store the answer
    activeGames[gameId].answer = sdp;
    
    console.log(`Answer received for game: ${gameId}`);
    res.json({ success: true });
});

// Check for an answer
app.get('/check-answer/:gameId', (req, res) => {
    const { gameId } = req.params;
    
    if (!activeGames[gameId]) {
        return res.status(404).json({ success: false, message: 'Game not found' });
    }
    
    // Return the answer if available
    res.json({
        success: true,
        sdp: activeGames[gameId].answer
    });
});

// Submit ICE candidates
app.post('/signal', (req, res) => {
    const { type, gameId, candidate } = req.body;
    
    if (type === 'ice-candidate' && gameId && candidate) {
        if (!pendingIceCandidates[gameId]) {
            pendingIceCandidates[gameId] = [];
        }
        
        // Store the ICE candidate
        pendingIceCandidates[gameId].push(candidate);
        console.log(`ICE candidate stored for game: ${gameId}`);
    }
    
    res.json({ success: true });
});

// Get pending ICE candidates
app.get('/ice-candidates/:gameId', (req, res) => {
    const { gameId } = req.params;
    
    if (!pendingIceCandidates[gameId]) {
        return res.json({ success: true, candidates: [] });
    }
    
    // Return and clear the pending candidates
    const candidates = [...pendingIceCandidates[gameId]];
    pendingIceCandidates[gameId] = [];
    
    res.json({
        success: true,
        candidates
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Chess Signaling Server Running');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});

/**
 * To deploy this server:
 * 
 * 1. Create a free account on Glitch.com, Render.com, or Railway.app
 * 2. Create a new Node.js project
 * 3. Upload this file as server.js
 * 4. Add package.json with dependencies:
 *    {
 *      "name": "chess-signaling-server",
 *      "version": "1.0.0",
 *      "main": "server.js",
 *      "dependencies": {
 *        "express": "^4.17.1",
 *        "cors": "^2.8.5"
 *      },
 *      "scripts": {
 *        "start": "node server.js"
 *      }
 *    }
 * 5. The free tier will automatically provide you with a URL
 * 6. Update the signalingServer variable in multiplayer.js with your URL
 */ 