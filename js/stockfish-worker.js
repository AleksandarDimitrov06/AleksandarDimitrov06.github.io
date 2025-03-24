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
        // Can adjust depth for difficulty (higher = stronger)
        const depth = data.depth || 5; // Lower depth for faster moves during testing
        stockfish.postMessage(`go depth ${depth}`);
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