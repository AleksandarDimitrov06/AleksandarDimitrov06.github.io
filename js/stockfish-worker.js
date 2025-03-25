// Stockfish Web Worker

// Variables to store Stockfish instance and state
let stockfish = null;
let isReady = false;
let bestMove = null;

// Initialize Stockfish
function initStockfish() {
    try {
        // Load Stockfish from CDN - you could also host it locally
        importScripts('https://cdn.jsdelivr.net/npm/stockfish.js@10/stockfish.js');
        
        // Set up Stockfish instance
        stockfish = new Worker(Stockfish());
        
        // Listen for messages from Stockfish
        stockfish.onmessage = function(event) {
            const message = event.data;
            
            // Debug info
            self.postMessage({
                type: 'debug',
                data: message
            });
            
            // Parse Stockfish output
            if (message.includes('bestmove')) {
                // Extract best move
                bestMove = message.split(' ')[1];
                
                // Send the best move back to the main thread
                self.postMessage({
                    type: 'bestmove',
                    move: bestMove
                });
            } else if (message.includes('readyok')) {
                isReady = true;
                self.postMessage({
                    type: 'ready'
                });
            }
        };
        
        // Initialize UCI protocol
        stockfish.postMessage('uci');
        stockfish.postMessage('isready');
        
        self.postMessage({
            type: 'status',
            data: 'Stockfish initialized successfully'
        });
    } catch (e) {
        self.postMessage({
            type: 'error',
            data: e.toString()
        });
    }
}

// Handle messages from the main thread
self.onmessage = function(event) {
    const data = event.data;
    
    // Debug - echo back to main thread
    self.postMessage({
        type: 'received',
        data: data
    });
    
    if (data.type === 'init') {
        // Initialize Stockfish
        initStockfish();
    } else if (data.type === 'position') {
        // Set the board position
        stockfish.postMessage(`position fen ${data.fen}`);
    } else if (data.type === 'go') {
        // Start calculating best move
        // Use difficulty-based depth and settings
        let depth = 12; // Default to medium difficulty
        let moveTime = null;
        let skillLevel = 20; // Default maximum skill (0-20)
        
        if (data.depth) {
            depth = data.depth;
        } else if (data.difficulty) {
            switch (data.difficulty) {
                case 'easy':
                    depth = 8; // Increased from 5
                    skillLevel = 8; // Lower skill = makes mistakes
                    moveTime = 700; // Short thinking time, but increased
                    break;
                case 'medium':
                    depth = 15; // Increased from 12
                    skillLevel = 15;
                    break;
                case 'hard':
                    depth = 22; // Increased from 18
                    skillLevel = 20; // Maximum skill
                    break;
                default:
                    depth = 12;
            }
        }
        
        // Set skill level (0-20)
        stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
        
        // In hard mode, also use more time for calculation
        let command = `go depth ${depth}`;
        if (moveTime) {
            command = `go movetime ${moveTime}`;
        }
        
        stockfish.postMessage(command);
    } else if (data.type === 'stop') {
        // Stop calculation
        stockfish.postMessage('stop');
    } else if (data.type === 'quit') {
        // Terminate Stockfish
        if (stockfish) {
            stockfish.postMessage('quit');
            stockfish = null;
        }
    }
}; 