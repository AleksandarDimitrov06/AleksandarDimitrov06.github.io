const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, './')));

// Game rooms and players
const rooms = {}; // roomId -> room data
const playerRooms = {}; // socketId -> roomId

// Generate a random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Create a new game room
    socket.on('createRoom', (callback) => {
        const roomId = generateRoomCode();
        rooms[roomId] = {
            id: roomId,
            players: [{
                id: socket.id,
                color: 'white' // First player is always white
            }],
            gameState: null,
            movesHistory: [],
            currentPlayer: 'white'
        };
        
        playerRooms[socket.id] = roomId;
        socket.join(roomId);
        
        console.log(`Room created: ${roomId} by player ${socket.id}`);
        callback({ 
            roomId, 
            color: 'white',
            success: true 
        });
    });
    
    // Join an existing room
    socket.on('joinRoom', (roomId, callback) => {
        roomId = roomId.toUpperCase();
        
        if (!rooms[roomId]) {
            callback({ success: false, message: 'Room not found' });
            return;
        }
        
        if (rooms[roomId].players.length >= 2) {
            callback({ success: false, message: 'Room is full' });
            return;
        }
        
        // Add player to room
        rooms[roomId].players.push({
            id: socket.id,
            color: 'black' // Second player is always black
        });
        
        playerRooms[socket.id] = roomId;
        socket.join(roomId);
        
        console.log(`Player ${socket.id} joined room ${roomId}`);
        
        // Notify first player that someone has joined
        const opponentId = rooms[roomId].players[0].id;
        io.to(opponentId).emit('opponentJoined', { opponentId: socket.id });
        
        callback({ 
            success: true, 
            roomId, 
            color: 'black',
            opponentId: opponentId
        });
        
        // Initialize the game - add a slight delay to ensure both clients are ready
        setTimeout(() => {
            console.log(`Starting game in room ${roomId}`);
            io.to(roomId).emit('gameStart', { 
                roomId,
                players: [
                    { id: rooms[roomId].players[0].id, color: 'white' },
                    { id: rooms[roomId].players[1].id, color: 'black' }
                ]
            });
        }, 1000);
    });
    
    // Handle a move
    socket.on('makeMove', (moveData) => {
        const roomId = playerRooms[socket.id];
        
        if (!roomId || !rooms[roomId]) {
            return;
        }
        
        const room = rooms[roomId];
        
        // Update game state
        room.gameState = moveData.gameState;
        room.currentPlayer = moveData.currentPlayer;
        room.movesHistory.push(moveData.move);
        
        // Send move to opponent
        socket.to(roomId).emit('opponentMove', moveData);
    });
    
    // Handle rematch request
    socket.on('requestRematch', () => {
        const roomId = playerRooms[socket.id];
        
        if (!roomId || !rooms[roomId]) return;
        
        socket.to(roomId).emit('rematchRequested', { requestedBy: socket.id });
    });
    
    // Handle rematch accepted
    socket.on('acceptRematch', () => {
        const roomId = playerRooms[socket.id];
        
        if (!roomId || !rooms[roomId]) return;
        
        // Reset room state
        rooms[roomId].gameState = null;
        rooms[roomId].movesHistory = [];
        rooms[roomId].currentPlayer = 'white';
        
        // Notify both players to reset game
        io.to(roomId).emit('rematchAccepted');
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        const roomId = playerRooms[socket.id];
        if (roomId && rooms[roomId]) {
            // Notify other player about disconnection
            socket.to(roomId).emit('opponentDisconnected');
            
            // Clean up if room is now empty
            const remainingPlayers = rooms[roomId].players.filter(p => p.id !== socket.id);
            if (remainingPlayers.length === 0) {
                delete rooms[roomId];
            } else {
                // Update players list
                rooms[roomId].players = remainingPlayers;
            }
        }
        
        // Clean up player's room association
        delete playerRooms[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 