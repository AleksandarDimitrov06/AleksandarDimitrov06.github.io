document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const board = document.getElementById('board');
    const statusDisplay = document.getElementById('status');
    const resetButton = document.getElementById('reset-btn');
    const menuButton = document.getElementById('menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');
    const playerVsPlayerBtn = document.getElementById('player-vs-player-btn');
    const playerVsComputerBtn = document.getElementById('player-vs-computer-btn');
    
    // Timer Elements
    const whiteTimer = document.getElementById('white-timer');
    const blackTimer = document.getElementById('black-timer');
    
    // Sound Elements
    const moveSound = document.getElementById('move-sound');
    const captureSound = document.getElementById('capture-sound');
    const checkSound = document.getElementById('check-sound');
    const gameStartSound = document.getElementById('game-start-sound');
    const gameEndSound = document.getElementById('game-end-sound');
    
    // Create pause button element
    const pauseButton = document.createElement('button');
    pauseButton.id = 'pause-btn';
    pauseButton.className = 'control-btn';
    pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Insert the pause button above the game field
    const boardContainer = document.querySelector('.board-container');
    boardContainer.insertAdjacentElement('beforebegin', pauseButton);
    
    // Pause overlay
    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.className = 'overlay';
    pauseOverlay.style.display = 'none';
    
    const pauseContent = document.createElement('div');
    pauseContent.className = 'overlay-content';
    
    const pauseTitle = document.createElement('h2');
    pauseTitle.textContent = 'Game Paused';
    
    const resumeButton = document.createElement('button');
    resumeButton.id = 'resume-btn';
    resumeButton.className = 'menu-btn';
    resumeButton.textContent = 'Resume Game';
    
    pauseContent.appendChild(pauseTitle);
    pauseContent.appendChild(resumeButton);
    pauseOverlay.appendChild(pauseContent);
    
    // Add it to the document body
    document.body.appendChild(pauseOverlay);
    
    // Game state
    let selectedPiece = null;
    let currentPlayer = 'white';
    let gameBoard = createBoard();
    let isGameOver = false;
    let isInCheck = false;
    let isComputerOpponent = false;
    let isComputerThinking = false;
    let stockfishWorker = null;
    let gameDifficulty = 'easy'; // Default difficulty setting
    let isPaused = false;
    
    // Timer state
    let moveTimeLimit = 60; // 60 seconds per move
    let remainingTime = moveTimeLimit;
    let timerInterval = null;
    
    // Show menu on load
    showMenu();
    
    // Setup event listeners immediately
    setupEventListeners();
    
    // Initialize the AI worker
    function initStockfish() {
        if (stockfishWorker !== null) {
            try {
                stockfishWorker.terminate();
            } catch (e) {
                console.error("Error terminating existing worker:", e);
            }
            stockfishWorker = null;
        }
        
        console.log("Initializing Stockfish worker...");
        
        try {
            // Create the stockfish web worker
            stockfishWorker = new Worker('js/stockfish-worker.js');
            
            // Handle messages from the worker
            stockfishWorker.onmessage = function(event) {
                const data = event.data;
                console.log("Message from stockfish worker:", data);
                
                if (data.type === 'bestmove' && isComputerThinking) {
                    console.log("Received best move:", data.move);
                    
                    // Apply the computer's move
                    const move = uciToCoordinates(data.move);
                    if (move) {
                        // We need a small delay to ensure UI updates properly
                        setTimeout(() => {
                            isComputerThinking = false;
                            // Remove thinking indicator
                            blackTimer.classList.remove('thinking');
                            
                            console.log("Applying move:", move);
                            makeComputerMove(move.startRow, move.startCol, move.endRow, move.endCol);
                        }, 100);
                    } else {
                        console.error("Failed to convert UCI move:", data.move);
                        isComputerThinking = false;
                        blackTimer.classList.remove('thinking');
                        
                        // Fall back to the simple AI
                        useFallbackAI();
                    }
                } else if (data.type === 'ready') {
                    console.log('Stockfish engine ready');
                } else if (data.type === 'debug') {
                    console.log('Stockfish debug:', data.data);
                } else if (data.type === 'error') {
                    console.error('Stockfish error:', data.data);
                    
                    // If there's an error from Stockfish, fall back to simple AI
                    if (isComputerThinking) {
                        isComputerThinking = false;
                        blackTimer.classList.remove('thinking');
                        useFallbackAI();
                    }
                } else if (data.type === 'status') {
                    console.log('Stockfish status:', data.data);
                } else if (data.type === 'received') {
                    console.log('Stockfish received:', data.data);
                }
            };
            
            stockfishWorker.onerror = function(error) {
                console.error("Worker error:", error);
                
                // If there's a worker error and we're waiting for a move, use the fallback
                if (isComputerThinking) {
                    isComputerThinking = false;
                    blackTimer.classList.remove('thinking');
                    useFallbackAI();
                }
                
                // Set stockfishWorker to null to ensure we don't try to use it again
                stockfishWorker = null;
            };
            
            // Initialize the engine with a timeout to ensure it's actually working
            stockfishWorker.postMessage({ type: 'init' });
            console.log("Init message sent to worker");
            
            // Set a timeout to check if Stockfish is operational
            setTimeout(() => {
                // If we haven't received a 'ready' message, assume Stockfish failed
                if (stockfishWorker && !stockfishWorker.isReady) {
                    console.warn("Stockfish didn't initialize properly within timeout");
                    // Don't set to null, we'll try one more time later if needed
                }
            }, 2000);
            
        } catch (e) {
            console.error("Error initializing Stockfish:", e);
            stockfishWorker = null; // Make sure we clear it so we use the fallback
        }
    }
    
    // Initialize the game
    function initializeGame(withComputer = false) {
        gameBoard = createBoard();
        selectedPiece = null;
        currentPlayer = 'white';
        isGameOver = false;
        isInCheck = false;
        isComputerOpponent = withComputer;
        isComputerThinking = false;
        
        renderBoard();
        updateStatus();
        updateCheckHighlight();
        
        // Initialize Stockfish if playing against computer
        if (isComputerOpponent) {
            console.log("Starting game with computer opponent");
            // On mobile, try to initialize Stockfish but don't wait for it
            initStockfish();
            
            // Set a safety timeout to ensure AI is initialized or fallback is ready
            setTimeout(() => {
                console.log("Checking AI initialization status");
                // This ensures we're ready for the AI's first move when the time comes
                if (isComputerOpponent && !stockfishWorker) {
                    console.log("Stockfish not available on this device, preparing fallback AI");
                }
            }, 1000);
        }
        
        // Reset and start timer
        resetTimer();
        startTimer();
        
        // Play game start sound
        playSound(gameStartSound);
    }
    
    // Make a move for the computer
    function makeComputerMove(startRow, startCol, endRow, endCol) {
        if (isGameOver || isPaused) {
            console.log("Game is over or paused, not making computer move");
            isComputerThinking = false;
            blackTimer.classList.remove('thinking');
            return;
        }
        
        console.log(`Computer moving piece from ${startRow},${startCol} to ${endRow},${endCol}`);
        
        const piece = gameBoard[startRow][startCol];
        if (!piece || piece.color !== currentPlayer) {
            console.error("Invalid computer move - wrong piece or color");
            return;
        }
        
        // For king moves, verify the move won't put the king in check
        if (piece.type === 'king') {
            // Create a test board to check if the destination is safe
            const testBoard = JSON.parse(JSON.stringify(gameBoard));
            movePieceOnBoard(testBoard, startRow, startCol, endRow, endCol);
            
            // Check if the king would be in check after the move
            const opponentColor = piece.color === 'white' ? 'black' : 'white';
            if (isSquareAttacked(endRow, endCol, opponentColor, testBoard)) {
                console.error(`Invalid king move to [${endRow},${endCol}] - would be in check`);
                return; // Don't make the move
            }
        }
        
        const isCapture = gameBoard[endRow][endCol] !== null;
        
        // Execute the move
        movePiece(startRow, startCol, endRow, endCol);
        
        // Check if this move gave check
        const opponentColor = currentPlayer === 'white' ? 'black' : 'white';
        const testBoard = JSON.parse(JSON.stringify(gameBoard));
        const willGiveCheck = isKingInCheck(opponentColor, testBoard);
        
        // Play appropriate sound
        if (willGiveCheck) {
            playSound(checkSound);
        } else if (isCapture) {
            playSound(captureSound);
        } else {
            playSound(moveSound);
        }
        
        // Switch turns
        switchTurn();
    }
    
    // Request a move from the computer
    function requestComputerMove() {
        if (!isComputerOpponent || isGameOver || currentPlayer !== 'black' || isPaused) {
            console.log("Not requesting computer move - conditions not met:", {
                isComputerOpponent,
                isGameOver,
                currentPlayer,
                isComputerThinking,
                isPaused
            });
            return;
        }
        
        // Always reset thinking state to recover from potential deadlocks
        if (isComputerThinking) {
            console.warn("Computer already thinking - resetting state and trying again");
            isComputerThinking = false;
            blackTimer.classList.remove('thinking');
        }
        
        // Set thinking state
        console.log("Requesting computer move for black");
        isComputerThinking = true;
        
        // Add visual indicator that computer is thinking
        const computerTimer = blackTimer;
        computerTimer.classList.add('thinking');
        
        // Set a timeout to prevent infinite AI thinking - shorter on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const timeoutDuration = isMobile ? 3000 : 5000; // Shorter timeout on mobile
        
        const safetyTimeout = setTimeout(() => {
            if (isComputerThinking) {
                console.warn("AI thinking timeout reached - forcing move");
                isComputerThinking = false;
                computerTimer.classList.remove('thinking');
                // Force a move if the AI is taking too long
                useFallbackAI();
            }
        }, timeoutDuration);
        
        // Use a small delay to give a thinking effect - shorter on mobile
        const thinkingDelay = isMobile ? 300 : 800;
        
        setTimeout(() => {
            // If game state has changed during the timeout, abort
            if (isGameOver || currentPlayer !== 'black' || isPaused) {
                console.log("Game state changed during thinking delay - aborting");
                isComputerThinking = false;
                computerTimer.classList.remove('thinking');
                clearTimeout(safetyTimeout);
                return;
            }
            
            try {
                // On mobile, prefer the simple AI for better performance
                if (isMobile || !stockfishWorker) {
                    console.log("Using simple AI (mobile or Stockfish unavailable)");
                    useFallbackAI();
                } else {
                    // Use Stockfish on desktop if available
                    requestStockfishMove();
                }
                clearTimeout(safetyTimeout);
            } catch (e) {
                console.error("Error in computer move request:", e);
                // Ensure we clean up properly
                isComputerThinking = false;
                computerTimer.classList.remove('thinking');
                clearTimeout(safetyTimeout);
                
                // If there's a serious error, use the fallback AI
                console.log("Error occurred, using fallback AI");
                setTimeout(() => useFallbackAI(), 100);
            }
        }, thinkingDelay);
    }
    
    // Request a move from Stockfish
    function requestStockfishMove() {
        if (!stockfishWorker || isGameOver || currentPlayer !== 'black' || isPaused) {
            console.log("Stockfish not available or game state changed");
            useFallbackAI();
            return;
        }
        
        console.log("Requesting move from Stockfish with difficulty:", gameDifficulty);
        
        try {
            // Set search depth based on difficulty - increased for more challenge
            let searchDepth = 15; // Medium difficulty - increased from 12
            
            if (gameDifficulty === 'easy') {
                searchDepth = 8; // Easy - shallow search but increased from 5
            } else if (gameDifficulty === 'hard') {
                searchDepth = 22; // Hard - deeper search - increased from 18
            }
            
            // Convert board to FEN
            const castlingRights = getCastlingRights(gameBoard);
            const fen = boardToFen(gameBoard, currentPlayer, castlingRights);
            console.log("Current position FEN:", fen);
            
            // Set the position and request a move
            stockfishWorker.postMessage({ type: 'position', fen: fen });
            stockfishWorker.postMessage({ 
                type: 'go', 
                depth: searchDepth,
                difficulty: gameDifficulty // Pass difficulty directly
            });
        } catch (e) {
            console.error("Error requesting move from Stockfish:", e);
            // Fall back to simple AI
            useFallbackAI();
        }
    }
    
    // Use the simple AI as a fallback
    function useFallbackAI() {
        if (isGameOver || currentPlayer !== 'black' || isPaused) {
            console.log("Game state changed, not using fallback AI");
            isComputerThinking = false;
            blackTimer.classList.remove('thinking');
            return;
        }
        
        // Create wrapper functions for the AI that ignore the currentPlayer check
        const isValidMoveWrapper = (startRow, startCol, endRow, endCol) => {
            try {
                // Get the actual piece from the board
                const piece = gameBoard[startRow][startCol];
                const targetSquare = gameBoard[endRow][endCol];
                
                // Skip the current player check that's in the original isValidMove
                
                // Basic validation: can't move to the same square
                if (startRow === endRow && startCol === endCol) return false;
                
                // Check if piece exists and is the correct color
                if (!piece || piece.color !== currentPlayer) return false;
                
                // Can't capture your own piece
                if (targetSquare && targetSquare.color === piece.color) return false;
                
                // Piece-specific movement rules - call the existing functions directly
                switch (piece.type) {
                    case 'pawn':
                        return isValidPawnMove(startRow, startCol, endRow, endCol);
                    case 'rook':
                        return isValidRookMove(startRow, startCol, endRow, endCol);
                    case 'knight':
                        return isValidKnightMove(startRow, startCol, endRow, endCol);
                    case 'bishop':
                        return isValidBishopMove(startRow, startCol, endRow, endCol);
                    case 'queen':
                        return isValidQueenMove(startRow, startCol, endRow, endCol);
                    case 'king':
                        return isValidKingMove(startRow, startCol, endRow, endCol);
                    default:
                        return false;
                }
            } catch (e) {
                console.error("Error in isValidMoveWrapper:", e);
                return false;
            }
        };
        
        const movePieceWrapper = (board, startRow, startCol, endRow, endCol) => {
            try {
                movePieceOnBoard(board, startRow, startCol, endRow, endCol);
            } catch (e) {
                console.error("Error in movePieceWrapper:", e);
            }
        };
        
        const isKingInCheckWrapper = (color, board) => {
            try {
                return isKingInCheck(color, board);
            } catch (e) {
                console.error("Error in isKingInCheckWrapper:", e);
                return false;
            }
        };
        
        console.log("AI is searching for moves with color:", currentPlayer);
        
        try {
            // Check if this is the first move (for mobile optimization)
            const isFirstMove = gameBoard.flat().filter(cell => 
                cell && cell.color === 'white' && cell.hasMoved).length <= 1;
            
            // On mobile or for the first move, use a simpler approach
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if ((isMobile && isFirstMove) || isFirstMove) {
                console.log("Using optimized first move for mobile");
                // Common first moves for black
                const commonFirstMoves = [
                    {startRow: 1, startCol: 4, endRow: 2, endCol: 4}, // e7-e6
                    {startRow: 1, startCol: 4, endRow: 3, endCol: 4}, // e7-e5
                    {startRow: 0, startCol: 1, endRow: 2, endCol: 2}, // Knight b8-c6
                    {startRow: 0, startCol: 6, endRow: 2, endCol: 5}  // Knight g8-f6
                ];
                
                // Try each common move
                for (const move of commonFirstMoves) {
                    if (isValidMoveWrapper(move.startRow, move.startCol, move.endRow, move.endCol)) {
                        // Check if this move is safe
                        const testBoard = JSON.parse(JSON.stringify(gameBoard));
                        movePieceWrapper(testBoard, move.startRow, move.startCol, move.endRow, move.endCol);
                        
                        if (!isKingInCheckWrapper('black', testBoard)) {
                            // Execute the move with a short delay
                            setTimeout(() => {
                                if (!isGameOver && currentPlayer === 'black' && !isPaused) {
                                    console.log("Executing common first move:", move);
                                    makeComputerMove(move.startRow, move.startCol, move.endRow, move.endCol);
                                } else {
                                    isComputerThinking = false;
                                    blackTimer.classList.remove('thinking');
                                }
                            }, 50);
                            return;
                        }
                    }
                }
            }
            
            // Find the best move using the full AI
            const bestMove = findBestMove(
                gameBoard, 
                currentPlayer, 
                isValidMoveWrapper, 
                movePieceWrapper, 
                isKingInCheckWrapper,
                gameDifficulty // Pass the difficulty setting
            );
            
            if (bestMove) {
                console.log("Simple AI selected move:", bestMove);
                // Execute the move
                setTimeout(() => {
                    if (!isGameOver && currentPlayer === 'black' && !isPaused) {
                        makeComputerMove(bestMove.startRow, bestMove.startCol, bestMove.endRow, bestMove.endCol);
                    } else {
                        console.log("Game state changed before move execution");
                        isComputerThinking = false;
                        blackTimer.classList.remove('thinking');
                    }
                }, 100);
            } else {
                console.error("No valid moves found by simple AI");
                
                // Check for checkmate or stalemate
                if (isKingInCheck(currentPlayer, gameBoard)) {
                    // Only declare checkmate if the isCheckmate function confirms it
                    if (isCheckmate(currentPlayer)) {
                        console.log("Computer is in checkmate");
                        isGameOver = true;
                        statusDisplay.textContent = "White wins by checkmate!";
                        playSound(gameEndSound);
                    } else {
                        // The AI should have found valid moves to escape check,
                        // but since it didn't, we'll force a simple move
                        console.log("King is in check but not checkmate - forcing a move");
                        // Reset thinking state before making random move
                        isComputerThinking = false;
                        blackTimer.classList.remove('thinking');
                        
                        // Add a small delay to ensure UI is updated
                        setTimeout(() => {
                            console.log("Executing makeRandomMove after delay");
                            makeRandomMove();
                        }, 500);
                    }
                } else {
                    console.log("Computer is in stalemate");
                    isGameOver = true;
                    statusDisplay.textContent = "Game ends in stalemate!";
                    playSound(gameEndSound);
                }
                
                isComputerThinking = false;
                blackTimer.classList.remove('thinking');
            }
        } catch (e) {
            console.error("Error in AI move calculation:", e);
            isComputerThinking = false;
            blackTimer.classList.remove('thinking');
            
            // Make a random valid move as last resort
            setTimeout(() => makeRandomMove(), 100);
        }
    }
    
    // Function to make a random valid move when all else fails
    function makeRandomMove() {
        if (isGameOver || currentPlayer !== 'black' || isPaused) {
            console.log("makeRandomMove aborted: Game over, not black's turn, or paused", {
                isGameOver,
                currentPlayer,
                isPaused
            });
            return;
        }
        
        console.log("Attempting to make a random move as last resort");
        
        // Find all black pieces
        const blackPieces = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (gameBoard[row][col] && gameBoard[row][col].color === 'black') {
                    blackPieces.push({row, col, piece: gameBoard[row][col]});
                }
            }
        }
        
        console.log(`Found ${blackPieces.length} black pieces to try moving`);
        
        // Randomize the pieces array to try different pieces first
        blackPieces.sort(() => Math.random() - 0.5);
        
        // Try to find a valid move for any piece
        for (const {row, col, piece} of blackPieces) {
            console.log(`Trying to find a move for ${piece.type} at [${row},${col}]`);
            
            // For each piece, try all possible destination squares
            for (let destRow = 0; destRow < 8; destRow++) {
                for (let destCol = 0; destCol < 8; destCol++) {
                    // Skip if same position
                    if (row === destRow && col === destCol) continue;
                    
                    try {
                        // Skip if destination has a black piece
                        if (gameBoard[destRow][destCol] && gameBoard[destRow][destCol].color === 'black') continue;
                        
                        // Check if the move is valid and doesn't leave king in check
                        if (isValidMove(row, col, destRow, destCol)) {
                            // Test if this move would put/leave own king in check
                            const testBoard = JSON.parse(JSON.stringify(gameBoard));
                            movePieceOnBoard(testBoard, row, col, destRow, destCol);
                            
                            if (!isKingInCheck('black', testBoard)) {
                                console.log(`FOUND valid move from [${row},${col}] to [${destRow},${destCol}]`);
                                // Immediately make this move without further delay
                                makeComputerMove(row, col, destRow, destCol);
                                return true;
                            }
                        }
                    } catch (e) {
                        console.error(`Error testing move from [${row},${col}] to [${destRow},${destCol}]:`, e);
                    }
                }
            }
        }
        
        console.error("CRITICAL: No valid random moves found despite having escape moves");
        
        // Final failsafe - move king to any adjacent square that's not occupied by own pieces
        const kingPos = findKing('black');
        if (kingPos) {
            console.log("Last resort: Trying to move king to any available square");
            for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                for (let colOffset = -1; colOffset <= 1; colOffset++) {
                    if (rowOffset === 0 && colOffset === 0) continue;
                    
                    const newRow = kingPos.row + rowOffset;
                    const newCol = kingPos.col + colOffset;
                    
                    if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;
                    if (gameBoard[newRow][newCol] && gameBoard[newRow][newCol].color === 'black') continue;
                    
                    // Check if the destination square is under attack
                    const testBoard = JSON.parse(JSON.stringify(gameBoard));
                    movePieceOnBoard(testBoard, kingPos.row, kingPos.col, newRow, newCol);
                    
                    // Only move the king if the destination square is not under attack
                    if (!isSquareAttacked(newRow, newCol, 'white', testBoard)) {
                        try {
                            makeComputerMove(kingPos.row, kingPos.col, newRow, newCol);
                            console.log(`Forced king move to [${newRow},${newCol}]`);
                            return true;
                        } catch (e) {
                            console.error("Failed to make forced king move:", e);
                        }
                    } else {
                        console.log(`Cannot move king to [${newRow},${newCol}] as it would be in check`);
                    }
                }
            }
        }
        
        // If we get here, there are truly no valid moves
        if (isKingInCheck('black', gameBoard)) {
            // Only declare checkmate if the isCheckmate function confirms it
            if (isCheckmate('black')) {
                console.log("Computer is in checkmate");
                isGameOver = true;
                statusDisplay.textContent = "White wins by checkmate!";
                playSound(gameEndSound);
            } else {
                console.log("CRITICAL ERROR: King is in check but not checkmate, yet no moves available");
                // Emergency recovery - just resume the game
                isComputerThinking = false;
                blackTimer.classList.remove('thinking');
                currentPlayer = 'white'; // Force turn back to white
                isInCheck = false;
                updateStatus();
                startTimer();
            }
        } else {
            console.log("Computer is in stalemate");
            isGameOver = true;
            statusDisplay.textContent = "Game ends in stalemate!";
            playSound(gameEndSound);
        }
    }
    
    // Timer functions
    function resetTimer() {
        // Stop existing timer if running
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Reset time
        remainingTime = moveTimeLimit;
        
        // Update timer displays
        whiteTimer.textContent = formatTime(remainingTime);
        blackTimer.textContent = formatTime(remainingTime);
        
        // Remove visual indicators
        whiteTimer.classList.remove('active', 'warning', 'thinking');
        blackTimer.classList.remove('active', 'warning', 'thinking');
    }
    
    function startTimer() {
        // Don't start timer if game is paused
        if (isPaused) {
            console.log("Game is paused, not starting timer");
            return;
        }
        
        // Don't start timer for computer's turn immediately
        if (isComputerOpponent && currentPlayer === 'black') {
            console.log("Computer's turn - requesting move instead of starting timer");
            
            // Update the timer display for visual consistency
            blackTimer.classList.add('active');
            whiteTimer.classList.remove('active');
            blackTimer.textContent = formatTime(moveTimeLimit); // Make sure the displayed time is reset
            
            // Always ensure isComputerThinking is reset before requesting a new move
            isComputerThinking = false;
            
            // Request computer move after a short delay to allow UI to update
            setTimeout(() => {
                if (!isGameOver && currentPlayer === 'black') {
                    console.log("Triggering computer move after delay");
                    requestComputerMove();
                }
            }, 500);
            
            return;
        }
        
        // First update the active timer indicators
        if (currentPlayer === 'white') {
            whiteTimer.classList.add('active');
            blackTimer.classList.remove('active');
        } else {
            blackTimer.classList.add('active');
            whiteTimer.classList.remove('active');
        }
        
        // Set the active timer display to the full time
        const activeTimer = currentPlayer === 'white' ? whiteTimer : blackTimer;
        activeTimer.textContent = formatTime(remainingTime);
        
        // Clear any existing interval first to prevent duplicates
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Start the countdown
        timerInterval = setInterval(() => {
            remainingTime--;
            
            // Update timer display
            activeTimer.textContent = formatTime(remainingTime);
            
            // Add warning class when time is running low (less than 10 seconds)
            if (remainingTime <= 10) {
                activeTimer.classList.add('warning');
            }
            
            // Handle timeout
            if (remainingTime <= 0) {
                handleTimeout();
            }
        }, 1000);
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }
    
    function handleTimeout() {
        // Stop the timer
        clearInterval(timerInterval);
        
        // Set game over state
        isGameOver = true;
        
        // Determine the winner (opposite of current player)
        const winner = currentPlayer === 'white' ? 'Black' : 'White';
        
        // Update status display
        statusDisplay.textContent = `${winner} wins by timeout!`;
        
        // Play game end sound
        playSound(gameEndSound);
    }
    
    function showMenu() {
        menuOverlay.style.display = 'flex';
        
        // If game was paused, hide the pause overlay
        if (isPaused) {
            pauseOverlay.style.display = 'none';
            isPaused = false;
        }
        
        // Stop the timer when menu is shown
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Reset the pause button text
        pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Clean up Stockfish if it's running
        if (stockfishWorker) {
            try {
                stockfishWorker.postMessage({ type: 'quit' });
                stockfishWorker = null;
            } catch (e) {
                console.error("Error cleaning up Stockfish:", e);
            }
        }
    }
    
    function hideMenu() {
        menuOverlay.style.display = 'none';
    }
    
    function createBoard() {
        // Initialize an 8x8 board array
        const boardArray = [];
        
        for (let i = 0; i < 8; i++) {
            boardArray[i] = Array(8).fill(null);
        }
        
        // Set up pawns
        for (let i = 0; i < 8; i++) {
            boardArray[1][i] = { type: 'pawn', color: 'black' };
            boardArray[6][i] = { type: 'pawn', color: 'white' };
        }
        
        // Set up other pieces
        const backRowPieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        for (let i = 0; i < 8; i++) {
            // Add hasMoved property to rooks and kings for castling
            if (backRowPieces[i] === 'king') {
                boardArray[0][i] = { type: backRowPieces[i], color: 'black', hasMoved: false };
                boardArray[7][i] = { type: backRowPieces[i], color: 'white', hasMoved: false };
            } else if (backRowPieces[i] === 'rook') {
                boardArray[0][i] = { type: backRowPieces[i], color: 'black', hasMoved: false };
                boardArray[7][i] = { type: backRowPieces[i], color: 'white', hasMoved: false };
            } else {
                boardArray[0][i] = { type: backRowPieces[i], color: 'black' };
                boardArray[7][i] = { type: backRowPieces[i], color: 'white' };
            }
        }
        
        return boardArray;
    }
    
    function renderBoard() {
        board.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                const piece = gameBoard[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color}-piece`;
                    pieceElement.innerHTML = getPieceSymbol(piece);
                    square.appendChild(pieceElement);
                }
                
                board.appendChild(square);
            }
        }
    }
    
    function getPieceSymbol(piece) {
        const symbols = {
            white: {
                pawn: '<i class="fas fa-chess-pawn fa-fw"></i>',
                rook: '<i class="fas fa-chess-rook fa-fw"></i>',
                knight: '<i class="fas fa-chess-knight fa-fw"></i>',
                bishop: '<i class="fas fa-chess-bishop fa-fw"></i>',
                queen: '<i class="fas fa-chess-queen fa-fw"></i>',
                king: '<i class="fas fa-chess-king fa-fw"></i>'
            },
            black: {
                pawn: '<i class="fas fa-chess-pawn fa-fw"></i>',
                rook: '<i class="fas fa-chess-rook fa-fw"></i>',
                knight: '<i class="fas fa-chess-knight fa-fw"></i>',
                bishop: '<i class="fas fa-chess-bishop fa-fw"></i>',
                queen: '<i class="fas fa-chess-queen fa-fw"></i>',
                king: '<i class="fas fa-chess-king fa-fw"></i>'
            }
        };
        
        return symbols[piece.color][piece.type];
    }
    
    function setupEventListeners() {
        // Board click events
        const board = document.getElementById('board');
        board.addEventListener('click', handleSquareClick);
        
        // Game control buttons
        const resetButton = document.getElementById('reset-btn');
        const menuButton = document.getElementById('menu-btn');
        const playerVsPlayerButton = document.getElementById('player-vs-player-btn');
        const playerVsComputerButton = document.getElementById('player-vs-computer-btn');
        const pauseButton = document.getElementById('pause-btn');
        const resumeButton = document.getElementById('resume-btn');
        
        // Get difficulty buttons
        const easyButton = document.getElementById('easy-btn');
        const mediumButton = document.getElementById('medium-btn');
        const hardButton = document.getElementById('hard-btn');
        
        // Add difficulty button event listeners
        easyButton.addEventListener('click', () => {
            setDifficulty('easy');
            updateDifficultyButtons('easy');
        });
        
        mediumButton.addEventListener('click', () => {
            setDifficulty('medium');
            updateDifficultyButtons('medium');
        });
        
        hardButton.addEventListener('click', () => {
            setDifficulty('hard');
            updateDifficultyButtons('hard');
        });
        
        resetButton.addEventListener('click', resetGame);
        menuButton.addEventListener('click', () => {
            // If in multiplayer game, confirm before leaving
            if (window.multiplayerModule && window.multiplayerModule.isMultiplayerGame()) {
                if (confirm('Are you sure you want to leave the current game?')) {
                    window.multiplayerModule.leaveGame();
                }
            } else {
                showMenu();
            }
        });
        
        if (pauseButton) pauseButton.addEventListener('click', togglePauseResume);
        if (resumeButton) resumeButton.addEventListener('click', resumeGame);
        
        playerVsPlayerButton.addEventListener('click', () => {
            hideMenu();
            initializeGame(false);
        });
        
        playerVsComputerButton.addEventListener('click', () => {
            hideMenu();
            initializeGame(true);
        });
        
        // Add resize event listener for responsive board
        window.addEventListener('resize', updateBoardSize);
        
        // Set up multiplayer-specific event listeners
        setupMultiplayerEventListeners();
        
        // Initial board size update
        updateBoardSize();
    }
    
    // Update the difficulty button states
    function updateDifficultyButtons(activeDifficulty) {
        const difficultyButtons = document.querySelectorAll('.difficulty-btn');
        difficultyButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        document.getElementById(`${activeDifficulty}-btn`).classList.add('active');
    }
    
    // Set the game difficulty
    function setDifficulty(difficulty) {
        gameDifficulty = difficulty;
        console.log(`Game difficulty set to: ${difficulty}`);
    }
    
    function updateBoardSize() {
        // This function can be called on window resize
        // You can add responsive adjustments here if needed
        console.log("Window resized, adjusting board size if needed");
    }
    
    // Window resize handling
    window.addEventListener('resize', updateBoardSize);
    
    function handleSquareClick(event) {
        if (isGameOver || isPaused) return;
        
        // Don't allow player to control black pieces when playing against computer
        if (isComputerOpponent && currentPlayer === 'black') {
            console.log("Computer's turn - player can't move black pieces");
            return;
        }
        
        const squareElement = event.target.closest('.square');
        if (!squareElement) return;
        
        const row = parseInt(squareElement.dataset.row);
        const col = parseInt(squareElement.dataset.col);
        
        // Clear previous selection highlights but don't clear check highlight
        clearHighlights();
        
        // If a piece is clicked
        const clickedPiece = gameBoard[row][col];
        
        // If a piece is already selected, try to move it
        if (selectedPiece) {
            const startRow = selectedPiece.row;
            const startCol = selectedPiece.col;
            const movingPiece = gameBoard[startRow][startCol];
            
            // Enforce that we're only moving pieces of the current player's color
            if (movingPiece && movingPiece.color === currentPlayer) {
                // First, check if this is a king in check trying to move
                const isKingMoving = movingPiece.type === 'king';
                
                // We're doing a basic valid move check to confirm the piece can move according to its rules
                if (isValidMove(startRow, startCol, row, col)) {
                    // Test if this move would put/leave own king in check
                    const testBoard = JSON.parse(JSON.stringify(gameBoard));
                    movePieceOnBoard(testBoard, startRow, startCol, row, col);
                    
                    // For kings, this check is already done in isValidKingMove, so we don't need to redo it
                    // For other pieces, we need to check if the move leaves the king in check
                    if (isKingMoving || !isKingInCheck(currentPlayer, testBoard)) {
                        const isCapture = gameBoard[row][col] !== null;
                        
                        // Check if this move will put opponent in check
                        const opponentColor = currentPlayer === 'white' ? 'black' : 'white';
                        // REMOVE THIS LINE: Don't overwrite the test board - movePieceOnBoard already moved the piece correctly
                        // testBoard[row][col] = movingPiece; // Make sure the piece is in the test board
                        const willGiveCheck = isKingInCheck(opponentColor, testBoard);
                        
                        // Execute the move
                        movePiece(startRow, startCol, row, col);
                        selectedPiece = null;
                        
                        // Play appropriate sound
                        if (willGiveCheck) {
                            // Only play check sound when giving check
                            playSound(checkSound);
                        } else if (isCapture) {
                            playSound(captureSound);
                        } else {
                            playSound(moveSound);
                        }
                        
                        // Switch turns now - this will also handle check/checkmate
                        switchTurn();
                    } else {
                        statusDisplay.textContent = "Invalid move: Your king would be in check!";
                        return;
                    }
                } else if (gameBoard[row][col] && gameBoard[row][col].color === currentPlayer) {
                    // Select a different piece of the same color
                    selectPiece(row, col);
                } else {
                    selectedPiece = null;
                }
            } else {
                // If somehow a piece of the wrong color was selected
                selectedPiece = null;
                // Try to select a new piece if it's of the current player's color
                if (clickedPiece && clickedPiece.color === currentPlayer) {
                    selectPiece(row, col);
                }
            }
        } else if (clickedPiece && clickedPiece.color === currentPlayer) {
            // Select a new piece only if it belongs to the current player
            selectPiece(row, col);
        }
        
        // Make sure check highlight is maintained
        updateCheckHighlight();
    }
    
    function selectPiece(row, col) {
        selectedPiece = { row, col };
        
        // Highlight the selected piece
        const squareElement = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        squareElement.classList.add('selected');
        
        // Highlight valid moves
        highlightValidMoves(row, col);
    }
    
    function highlightValidMoves(row, col) {
        const piece = gameBoard[row][col];
        
        // Check if the king of the current player is in check
        const isPlayerInCheck = isKingInCheck(currentPlayer, gameBoard);
        
        // Special case for king in check - we need to highlight all possible escape squares
        if (piece.type === 'king' && isPlayerInCheck) {
            // Highlight all squares where the king can safely move
            for (let r = Math.max(0, row - 1); r <= Math.min(7, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
                    // Skip the current position
                    if (row === r && col === c) continue;
                    
                    // Skip squares with pieces of the same color
                    if (gameBoard[r][c] && gameBoard[r][c].color === piece.color) continue;
                    
                    // Instead of checking separately, use the isValidKingMove function
                    // which already has the logic to check if a destination is safe
                    if (isValidKingMove(row, col, r, c)) {
                        const squareElement = document.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
                        squareElement.classList.add('highlight');
                    }
                }
            }
        }
        // Special handling for king castling
        else if (piece.type === 'king' && !piece.hasMoved && !isPlayerInCheck) {
            // Check kingside castling availability
            const kingsideRookCol = 7;
            const kingsideRook = gameBoard[row][kingsideRookCol];
            if (kingsideRook && kingsideRook.type === 'rook' && 
                kingsideRook.color === piece.color && !kingsideRook.hasMoved) {
                
                // Check if squares between king and rook are empty
                let pathClear = true;
                for (let c = col + 1; c < kingsideRookCol; c++) {
                    if (gameBoard[row][c] !== null) {
                        pathClear = false;
                        break;
                    }
                }
                
                // Check if the king's path is not under attack
                if (pathClear) {
                    const testBoard = JSON.parse(JSON.stringify(gameBoard));
                    
                    // Check if the square king moves through is safe
                    let pathSafe = true;
                    movePieceOnBoard(testBoard, row, col, row, col + 1);
                    
                    if (isSquareAttacked(row, col + 1, piece.color === 'white' ? 'black' : 'white', testBoard)) {
                        pathSafe = false;
                    }
                    
                    // Also check the destination square
                    const testBoard2 = JSON.parse(JSON.stringify(gameBoard));
                    movePieceOnBoard(testBoard2, row, col, row, col + 2);
                    
                    if (pathSafe && !isSquareAttacked(row, col + 2, piece.color === 'white' ? 'black' : 'white', testBoard2)) {
                        const castleSquare = document.querySelector(`.square[data-row="${row}"][data-col="${col + 2}"]`);
                        castleSquare.classList.add('highlight', 'castle-move');
                    }
                }
            }
            
            // Check queenside castling availability
            const queensideRookCol = 0;
            const queensideRook = gameBoard[row][queensideRookCol];
            if (queensideRook && queensideRook.type === 'rook' && 
                queensideRook.color === piece.color && !queensideRook.hasMoved) {
                
                // Check if squares between king and rook are empty
                let pathClear = true;
                for (let c = col - 1; c > queensideRookCol; c--) {
                    if (gameBoard[row][c] !== null) {
                        pathClear = false;
                        break;
                    }
                }
                
                // Check if the king's path is not under attack
                if (pathClear) {
                    const testBoard = JSON.parse(JSON.stringify(gameBoard));
                    
                    // Check if the square king moves through is safe
                    let pathSafe = true;
                    movePieceOnBoard(testBoard, row, col, row, col - 1);
                    
                    if (isSquareAttacked(row, col - 1, piece.color === 'white' ? 'black' : 'white', testBoard)) {
                        pathSafe = false;
                    }
                    
                    // Also check the destination square
                    const testBoard2 = JSON.parse(JSON.stringify(gameBoard));
                    movePieceOnBoard(testBoard2, row, col, row, col - 2);
                    
                    if (pathSafe && !isSquareAttacked(row, col - 2, piece.color === 'white' ? 'black' : 'white', testBoard2)) {
                        const castleSquare = document.querySelector(`.square[data-row="${row}"][data-col="${col - 2}"]`);
                        castleSquare.classList.add('highlight', 'castle-move');
                    }
                }
            }
        }
        
        // For king in check, only the king's valid moves were processed above
        // For all other cases, continue with normal move highlighting
        if (!(piece.type === 'king' && isPlayerInCheck)) {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    // Skip the current position
                    if (row === r && col === c) continue;
                    
                    // Skip squares with pieces of the same color
                    if (gameBoard[r][c] && gameBoard[r][c].color === piece.color) continue;
                    
                    // Check if the move is valid according to piece movement rules
                    if (isValidMove(row, col, r, c)) {
                        // Test if this move would leave the king in check
                        const testBoard = JSON.parse(JSON.stringify(gameBoard));
                        movePieceOnBoard(testBoard, row, col, r, c);
                        
                        // Only highlight the move if it doesn't leave the king in check
                        if (!isKingInCheck(piece.color, testBoard)) {
                            const squareElement = document.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
                            squareElement.classList.add('highlight');
                        }
                    }
                }
            }
        }
    }
    
    function clearHighlights() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            square.classList.remove('selected', 'highlight');
            // Don't remove the check class here - it will be handled separately
        });
    }
    
    // Add a utility function to highlight king's escape options
    function showKingEscapeMoves(row, col) {
        // Highlight all valid moves for the king
        for (let r = Math.max(0, row - 1); r <= Math.min(7, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
                // Skip the current position
                if (row === r && col === c) continue;
                
                // Skip squares with own pieces
                if (gameBoard[r][c] && gameBoard[r][c].color === currentPlayer) continue;
                
                // Check if the move is valid (not moving into check)
                if (isValidKingMove(row, col, r, c)) {
                    const squareElement = document.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
                    if (squareElement) {
                        squareElement.classList.add('escape-square');
                    }
                }
            }
        }
    }
    
    // Update the check highlight function to include escape move highlighting
    function updateCheckHighlight() {
        // First remove any existing check highlight and escape highlights
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('check', 'escape-square');
        });
        
        // Only add check highlight if a king is in check
        if (isInCheck) {
            const kingPosition = findKing(currentPlayer);
            if (kingPosition) {
                const kingSquare = document.querySelector(`.square[data-row="${kingPosition.row}"][data-col="${kingPosition.col}"]`);
                if (kingSquare) {
                    kingSquare.classList.add('check');
                    
                    // If king is in check but not checkmate, show escape options
                    if (!isCheckmate(currentPlayer)) {
                        showKingEscapeMoves(kingPosition.row, kingPosition.col);
                    }
                }
            }
        }
    }
    
    function isValidMove(startRow, startCol, endRow, endCol) {
        // Basic validation: can't move to the same square
        if (startRow === endRow && startCol === endCol) return false;
        
        const piece = gameBoard[startRow][startCol];
        const targetSquare = gameBoard[endRow][endCol];
        
        // Validate that the piece belongs to the current player
        if (piece.color !== currentPlayer) return false;
        
        // Can't capture your own piece
        if (targetSquare && targetSquare.color === piece.color) return false;
        
        // Piece-specific movement rules
        switch (piece.type) {
            case 'pawn':
                return isValidPawnMove(startRow, startCol, endRow, endCol);
            case 'rook':
                return isValidRookMove(startRow, startCol, endRow, endCol);
            case 'knight':
                return isValidKnightMove(startRow, startCol, endRow, endCol);
            case 'bishop':
                return isValidBishopMove(startRow, startCol, endRow, endCol);
            case 'queen':
                return isValidQueenMove(startRow, startCol, endRow, endCol);
            case 'king':
                return isValidKingMove(startRow, startCol, endRow, endCol);
            default:
                return false;
        }
    }
    
    function isValidPawnMove(startRow, startCol, endRow, endCol) {
        const piece = gameBoard[startRow][startCol];
        const direction = piece.color === 'white' ? -1 : 1;
        const targetSquare = gameBoard[endRow][endCol];
        
        // Forward movement (no capture)
        if (startCol === endCol && !targetSquare) {
            // Single step forward
            if (endRow === startRow + direction) {
                return true;
            }
            
            // Double step from starting position
            if ((piece.color === 'white' && startRow === 6 && endRow === 4) ||
                (piece.color === 'black' && startRow === 1 && endRow === 3)) {
                // Check if the square in between is empty
                return !gameBoard[startRow + direction][startCol];
            }
        }
        
        // Diagonal capture
        if (Math.abs(startCol - endCol) === 1 && endRow === startRow + direction) {
            return targetSquare && targetSquare.color !== piece.color;
        }
        
        return false;
    }
    
    function isValidRookMove(startRow, startCol, endRow, endCol) {
        // Rook moves horizontally or vertically
        if (startRow !== endRow && startCol !== endCol) return false;
        
        return checkClearPath(startRow, startCol, endRow, endCol, gameBoard);
    }
    
    function isValidKnightMove(startRow, startCol, endRow, endCol) {
        // Knight moves in an L-shape: 2 squares in one direction and 1 square perpendicular
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }
    
    function isValidBishopMove(startRow, startCol, endRow, endCol) {
        // Bishop moves diagonally
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        
        if (rowDiff !== colDiff) return false;
        
        return checkClearPath(startRow, startCol, endRow, endCol, gameBoard);
    }
    
    function isValidQueenMove(startRow, startCol, endRow, endCol) {
        // Queen combines rook and bishop movements
        // Check for horizontal/vertical movement
        if (startRow === endRow || startCol === endCol) {
            return checkClearPath(startRow, startCol, endRow, endCol, gameBoard);
        }
        
        // Check for diagonal movement
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        
        if (rowDiff === colDiff) {
            return checkClearPath(startRow, startCol, endRow, endCol, gameBoard);
        }
        
        return false;
    }
    
    function isValidKingMove(startRow, startCol, endRow, endCol) {
        const king = gameBoard[startRow][startCol];
        
        console.log(`Checking king move from [${startRow},${startCol}] to [${endRow},${endCol}]`);
        
        // Regular king move: one square in any direction
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        
        // Basic movement validation - king can only move one square in any direction
        if (rowDiff > 1 || colDiff > 1) {
            // Special case: castling
            if (startRow === endRow && !king.hasMoved && !isKingInCheck(king.color, gameBoard)) {
                // Castling logic - handled below
            } else {
                console.log(`King move rejected: too far - distance [${rowDiff},${colDiff}]`);
                return false;
            }
        }
        
        // Check if the king is moving to its own square (should never happen, but safety check)
        if (rowDiff === 0 && colDiff === 0) {
            console.log(`King move rejected: trying to move to its own square`);
            return false;
        }
        
        // First check if destination has a piece of the same color
        if (gameBoard[endRow][endCol] && gameBoard[endRow][endCol].color === king.color) {
            console.log(`King move rejected: destination has same color piece at [${endRow},${endCol}]`);
            return false;
        }
        
        // For normal one-square king moves, create a separate board copy for safe validation
        if (rowDiff <= 1 && colDiff <= 1) {
            // Create a test board to check if the destination square is safe from attack
            const testBoard = JSON.parse(JSON.stringify(gameBoard));
            // Move the king to the new position in our test board
            testBoard[endRow][endCol] = king;
            testBoard[startRow][startCol] = null;
            
            // Ensure the king doesn't move to a square that's under attack
            const opponentColor = king.color === 'white' ? 'black' : 'white';
            console.log(`Testing if king move to [${endRow},${endCol}] is safe...`);
            const isUnderAttack = isSquareAttacked(endRow, endCol, opponentColor, testBoard);
            
            // If not under attack, it's a valid move
            if (!isUnderAttack) {
                console.log(`✓ King can safely move from [${startRow},${startCol}] to [${endRow},${endCol}]`);
                return true;
            } else {
                console.log(`King move rejected: destination [${endRow},${endCol}] is under attack`);
                return false;
            }
        }
        
        // Check for castling
        if (startRow === endRow && !king.hasMoved && !isKingInCheck(king.color, gameBoard)) {
            // Kingside castling (to the right)
            if (endCol === startCol + 2) {
                // Check rook presence and movement history
                const rookCol = 7;
                const rook = gameBoard[startRow][rookCol];
                if (!rook || rook.type !== 'rook' || rook.color !== king.color || rook.hasMoved) {
                    console.log('Kingside castling rejected: rook constraints not met');
                    return false;
                }
                
                // Check if squares between king and rook are empty
                for (let col = startCol + 1; col < rookCol; col++) {
                    if (gameBoard[startRow][col] !== null) {
                        console.log(`Kingside castling rejected: path not clear at [${startRow},${col}]`);
                        return false;
                    }
                }
                
                // Check if king passes through or to a square under attack
                const opponentColor = king.color === 'white' ? 'black' : 'white';
                
                // Check if the current square is under attack
                if (isSquareAttacked(startRow, startCol, opponentColor, gameBoard)) {
                    console.log(`Kingside castling rejected: king is in check`);
                    return false;
                }
                
                // Check if the square the king passes through is under attack
                if (isSquareAttacked(startRow, startCol + 1, opponentColor, gameBoard)) {
                    console.log(`Kingside castling rejected: path through [${startRow},${startCol + 1}] is under attack`);
                    return false;
                }
                
                // Check if the destination square is under attack
                if (isSquareAttacked(startRow, startCol + 2, opponentColor, gameBoard)) {
                    console.log(`Kingside castling rejected: destination [${startRow},${startCol + 2}] is under attack`);
                    return false;
                }
                
                console.log('✓ Kingside castling is valid');
                return true;
            }
            
            // Queenside castling (to the left)
            if (endCol === startCol - 2) {
                // Check rook presence and movement history
                const rookCol = 0;
                const rook = gameBoard[startRow][rookCol];
                if (!rook || rook.type !== 'rook' || rook.color !== king.color || rook.hasMoved) {
                    console.log('Queenside castling rejected: rook constraints not met');
                    return false;
                }
                
                // Check if squares between king and rook are empty
                for (let col = startCol - 1; col > rookCol; col--) {
                    if (gameBoard[startRow][col] !== null) {
                        console.log(`Queenside castling rejected: path not clear at [${startRow},${col}]`);
                        return false;
                    }
                }
                
                // Check if king passes through or to a square under attack
                const opponentColor = king.color === 'white' ? 'black' : 'white';
                
                // Check if the current square is under attack
                if (isSquareAttacked(startRow, startCol, opponentColor, gameBoard)) {
                    console.log(`Queenside castling rejected: king is in check`);
                    return false;
                }
                
                // Check if the squares the king passes through are under attack
                if (isSquareAttacked(startRow, startCol - 1, opponentColor, gameBoard)) {
                    console.log(`Queenside castling rejected: path through [${startRow},${startCol - 1}] is under attack`);
                    return false;
                }
                
                // Check if the destination square is under attack
                if (isSquareAttacked(startRow, startCol - 2, opponentColor, gameBoard)) {
                    console.log(`Queenside castling rejected: destination [${startRow},${startCol - 2}] is under attack`);
                    return false;
                }
                
                console.log('✓ Queenside castling is valid');
                return true;
            }
        }
        
        // If we get here, the move is not valid
        console.log(`King move rejected: not a valid move pattern`);
        return false;
    }
    
    function findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    function isSquareAttacked(row, col, attackerColor, board) {
        // Check if a square is attacked by any piece of the specified color
        console.log(`Checking if square [${row},${col}] is attacked by ${attackerColor} pieces`);
        
        // Track who is attacking for debugging
        const attackers = [];
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === attackerColor) {
                    // Skip if this piece is the same square we're checking (can happen in recursion)
                    if (r === row && c === col) continue;
                    
                    // Use simple, foolproof rules for attack detection to avoid recursion issues
                    let validAttack = false;
                    
                    try {
                        switch (piece.type) {
                            case 'pawn':
                                // Pawns attack diagonally forward
                                const direction = piece.color === 'white' ? -1 : 1;
                                // Check if the attacking pawn can reach the target square diagonally
                                // The pawn at [r,c] attacks [row,col] if [row,col] is one diagonal step forward
                                validAttack = (Math.abs(c - col) === 1) && (row === r + direction);
                                break;
                                
                            case 'rook':
                                // Rooks attack in straight lines
                                if (r === row || c === col) {
                                    validAttack = checkClearPath(r, c, row, col, board);
                                }
                                break;
                                
                            case 'knight':
                                // Knights attack in L-shapes
                                const rowDiff = Math.abs(r - row);
                                const colDiff = Math.abs(c - col);
                                validAttack = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
                                break;
                                
                            case 'bishop':
                                // Bishops attack diagonally
                                const diagDiff = Math.abs(r - row);
                                if (diagDiff === Math.abs(c - col)) {
                                    validAttack = checkClearPath(r, c, row, col, board);
                                }
                                break;
                                
                            case 'queen':
                                // Queens attack like rooks and bishops combined
                                if ((r === row || c === col) || (Math.abs(r - row) === Math.abs(c - col))) {
                                    validAttack = checkClearPath(r, c, row, col, board);
                                }
                                break;
                                
                            case 'king':
                                // Kings attack adjacent squares
                                const kingRowDiff = Math.abs(r - row);
                                const kingColDiff = Math.abs(c - col);
                                validAttack = kingRowDiff <= 1 && kingColDiff <= 1;
                                break;
                        }
                        
                        // Debug output for troubleshooting checkmate detection
                        if (validAttack) {
                            console.log(`★ Square [${row},${col}] is attacked by ${piece.color} ${piece.type} at [${r},${c}]`);
                            attackers.push(`${piece.type} at [${r},${c}]`);
                        }
                    } catch (e) {
                        console.error(`Error in isSquareAttacked from [${r},${c}] to [${row},${col}]:`, e);
                    }
                }
            }
        }
        
        // If we found attackers, return true
        if (attackers.length > 0) {
            console.log(`Square [${row},${col}] is under attack by ${attackers.length} piece(s): ${attackers.join(', ')}`);
            return true;
        }
        
        // If we get here, the square is not under attack
        console.log(`✓ Square [${row},${col}] is NOT under attack by ${attackerColor} pieces`);
        return false;
    }
    
    function isKingInCheck(color, board) {
        const kingPosition = findKing(color);
        if (!kingPosition) return false;
        
        const opponentColor = color === 'white' ? 'black' : 'white';
        return isSquareAttacked(kingPosition.row, kingPosition.col, opponentColor, board);
    }
    
    function canPieceMoveAnywhere(row, col, board) {
        const piece = board[row][col];
        if (!piece) {
            console.log(`No piece found at [${row},${col}]`);
            return false;
        }
        
        console.log(`Checking if ${piece.color} ${piece.type} at [${row},${col}] can move anywhere`);
        
        // Try all possible destination squares
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                // Skip if same position
                if (row === r && col === c) continue;
                
                // Skip if destination has a piece of the same color
                if (board[r][c] && board[r][c].color === piece.color) continue;
                
                // Check if the move is valid according to piece movement rules
                let isValid = false;
                
                // Directly check movement rules instead of using isValidMove to avoid potential bugs
                try {
                    switch (piece.type) {
                        case 'pawn': {
                            // Forward movement
                            const direction = piece.color === 'white' ? -1 : 1;
                            
                            // One square forward
                            if (c === col && r === row + direction && !board[r][c]) {
                                isValid = true;
                            }
                            // Two squares from start
                            else if (c === col && 
                                    ((piece.color === 'white' && row === 6 && r === 4) || 
                                     (piece.color === 'black' && row === 1 && r === 3)) && 
                                    !board[row + direction][col] && !board[r][c]) {
                                isValid = true;
                            }
                            // Diagonal capture
                            else if (Math.abs(c - col) === 1 && r === row + direction && board[r][c] && 
                                     board[r][c].color !== piece.color) {
                                isValid = true;
                            }
                            break;
                        }
                        case 'rook':
                            if ((r === row || c === col) && checkClearPath(row, col, r, c, board)) {
                                isValid = true;
                            }
                            break;
                        case 'knight': {
                            const rowDiff = Math.abs(r - row);
                            const colDiff = Math.abs(c - col);
                            if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
                                isValid = true;
                            }
                            break;
                        }
                        case 'bishop':
                            if (Math.abs(r - row) === Math.abs(c - col) && checkClearPath(row, col, r, c, board)) {
                                isValid = true;
                            }
                            break;
                        case 'queen':
                            if (((r === row || c === col) || (Math.abs(r - row) === Math.abs(c - col))) && 
                                checkClearPath(row, col, r, c, board)) {
                                isValid = true;
                            }
                            break;
                        case 'king': {
                            const rowDiff = Math.abs(r - row);
                            const colDiff = Math.abs(c - col);
                            // Regular king move (one square in any direction)
                            if (rowDiff <= 1 && colDiff <= 1) {
                                isValid = true;
                            }
                            // Castling checks would be handled by isValidKingMove
                            break;
                        }
                    }
                    
                    if (isValid) {
                        // Create a test board to see if this move would resolve the check
                        const testBoard = JSON.parse(JSON.stringify(board));
                        movePieceOnBoard(testBoard, row, col, r, c);
                        
                        // Check if this move would leave or get the king out of check
                        const kingInCheck = isKingInCheck(piece.color, testBoard);
                        
                        if (!kingInCheck) {
                            console.log(`Found valid move: ${piece.color} ${piece.type} from [${row},${col}] to [${r},${c}]`);
                            return true;
                        }
                    }
                } catch (e) {
                    console.error(`Error checking move from [${row},${col}] to [${r},${c}]:`, e);
                }
            }
        }
        
        console.log(`No valid moves found for ${piece.color} ${piece.type} at [${row},${col}]`);
        return false;
    }
    
    // Helper function to move pieces on a test board without side effects
    function movePieceOnBoard(board, startRow, startCol, endRow, endCol) {
        // Move the piece on the provided board
        const piece = board[startRow][startCol];
        if (!piece) return;
        
        // Move the piece
        board[endRow][endCol] = piece;
        board[startRow][startCol] = null;
    }
    
    function isCheckmate(color) {
        console.log(`Checking if ${color} is in checkmate...`);
        
        // Check if the king is in check
        if (!isKingInCheck(color, gameBoard)) {
            console.log(`${color} king is not in check, so definitely not checkmate`);
            return false;
        }
        
        console.log(`${color} king is in check, checking for possible escape moves...`);
        
        // Find the king's position
        let kingRow = -1;
        let kingCol = -1;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    kingRow = row;
                    kingCol = col;
                    break;
                }
            }
            if (kingRow !== -1) break;
        }
        
        if (kingRow === -1) {
            console.error(`King not found for ${color} - this should never happen`);
            return false;
        }
        
        console.log(`${color} king found at [${kingRow},${kingCol}]`);
        
        // 1. Check if the king can move anywhere
        // Test all adjacent squares manually to be sure
        console.log("=== Testing all possible king moves: ===");
        let validMoveCount = 0;
        
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
            for (let colOffset = -1; colOffset <= 1; colOffset++) {
                // Skip the current position (0,0 offset)
                if (rowOffset === 0 && colOffset === 0) continue;
                
                const newRow = kingRow + rowOffset;
                const newCol = kingCol + colOffset;
                
                // Check bounds
                if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
                    console.log(`Skip [${newRow},${newCol}] - out of bounds`);
                    continue;
                }
                
                // Skip squares with pieces of the same color
                if (gameBoard[newRow][newCol] && gameBoard[newRow][newCol].color === color) {
                    console.log(`Skip [${newRow},${newCol}] - occupied by ${color} piece`);
                    continue;
                }
                
                // Test directly with our move validation
                console.log(`---`);
                console.log(`Testing king move to [${newRow},${newCol}]...`);
                
                if (isValidKingMove(kingRow, kingCol, newRow, newCol)) {
                    console.log(`★★★ VALID ESCAPE FOUND: King can move to [${newRow},${newCol}] ★★★`);
                    validMoveCount++;
                } else {
                    // Double-check why the move was rejected
                    // Let's see if the square is actually under attack
                    console.log(`Double-checking if [${newRow},${newCol}] is really under attack:`);
                    
                    // Make a copy of the board for testing
                    const testBoard = JSON.parse(JSON.stringify(gameBoard));
                    // Move the king to the test position
                    movePieceOnBoard(testBoard, kingRow, kingCol, newRow, newCol);
                    
                    // Check if the king would be in check in this position
                    const opponentColor = color === 'white' ? 'black' : 'white';
                    const definitelyAttacked = isSquareAttacked(newRow, newCol, opponentColor, testBoard);
                    
                    if (definitelyAttacked) {
                        console.log(`Confirmed: [${newRow},${newCol}] is definitely under attack`);
                    } else {
                        console.log(`WARNING: Move validation rejected [${newRow},${newCol}] but it may be safe!`);
                        // If we detect an inconsistency, we should be conservative and say it's not checkmate
                        return false;
                    }
                }
            }
        }
        
        console.log(`=== King has ${validMoveCount} valid escape moves ===`);
        if (validMoveCount > 0) {
            console.log(`King can escape check, so it's not checkmate`);
            return false;
        }
        
        // 2. Check if any other piece can block the check or capture the checking piece
        console.log("=== Checking if any other piece can help the king... ===");
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === color && piece.type !== 'king') {
                    console.log(`Testing if ${piece.type} at [${row},${col}] can help...`);
                    
                    // Check if this piece can block or capture
                    if (canPieceMoveAnywhere(row, col, gameBoard)) {
                        console.log(`${color} ${piece.type} at [${row},${col}] can block or capture to resolve check`);
                        return false;
                    }
                }
            }
        }
        
        // If king is in check and no piece can make a legal move, it's checkmate
        console.log(`CHECKMATE CONFIRMED: ${color} king has no legal moves and no piece can help`);
        return true;
    }
    
    function isStalemate(color) {
        // If the king is in check, it's not stalemate
        if (isKingInCheck(color, gameBoard)) {
            return false;
        }
        
        // Check if any piece of the specified color can make a legal move
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === color) {
                    if (canPieceMoveAnywhere(row, col, gameBoard)) {
                        return false;
                    }
                }
            }
        }
        
        // If king is NOT in check and no piece can move legally, it's stalemate
        return true;
    }
    
    function movePiece(startRow, startCol, endRow, endCol) {
        // Get the piece that is being moved
        const piece = gameBoard[startRow][startCol];
        
        // Check if there's a piece to move
        if (!piece) {
            console.error(`No piece at [${startRow},${startCol}]`);
            return false;
        }
        
        // Check if it's this player's turn in multiplayer
        if (window.multiplayerModule && window.multiplayerModule.isMultiplayerGame()) {
            if (!window.multiplayerModule.isMyTurn()) {
                console.error("Not your turn in multiplayer game");
                return false;
            }
            
            // Check if piece color matches player color in multiplayer
            const playerColor = window.multiplayerModule.getPlayerColor();
            if (piece.color !== playerColor) {
                console.error(`Cannot move opponent's piece in multiplayer game`);
                return false;
            }
        }
        
        console.log(`Moving ${piece.color} ${piece.type} from [${startRow},${startCol}] to [${endRow},${endCol}]`);
        
        // Check if this is a castling move
        if (piece.type === 'king' && Math.abs(startCol - endCol) === 2) {
            // Determine if it's kingside or queenside castling
            const isKingside = endCol > startCol;
            const rookCol = isKingside ? 7 : 0;
            const rookNewCol = isKingside ? endCol - 1 : endCol + 1;
            
            // Move the rook
            gameBoard[endRow][rookNewCol] = gameBoard[endRow][rookCol];
            gameBoard[endRow][rookCol] = null;
            
            // Mark the rook as moved
            if (gameBoard[endRow][rookNewCol]) {
                gameBoard[endRow][rookNewCol].hasMoved = true;
            }
            
            // Play the move sound
            playSound(moveSound);
        } else if (gameBoard[endRow][endCol]) {
            // This is a capture
            playSound(captureSound);
        } else {
            // Regular move
            playSound(moveSound);
        }
        
        // Execute the move
        gameBoard[endRow][endCol] = piece;
        gameBoard[startRow][startCol] = null;
        
        // Mark king and rook as moved (for castling logic)
        if (piece.type === 'king' || piece.type === 'rook') {
            piece.hasMoved = true;
        }
        
        // Handle pawn promotion
        if (piece.type === 'pawn' && (endRow === 0 || endRow === 7)) {
            piece.type = 'queen';
            
            // Play a sound for promotion
            playSound(captureSound);
            
            console.log(`Pawn promoted to queen at [${endRow},${endCol}]`);
        }
        
        // Re-render the board after moving
        renderBoard();
        
        // If this is a multiplayer game and it's the player's turn, send the move
        if (window.multiplayerModule && window.multiplayerModule.isMultiplayerGame() && window.multiplayerModule.isMyTurn()) {
            console.log("Sending multiplayer move");
            window.multiplayerModule.sendMove({
                startRow, 
                startCol, 
                endRow, 
                endCol
            });
        }
        
        return true;
    }
    
    // Switch turns between players
    function switchTurn() {
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        
        // Reset the selected piece
        selectedPiece = null;
        
        // Clear all highlights
        clearHighlights();
        
        // Reset timer for the next move
        resetTimer();
        startTimer();
        
        // Update active timer indicator
        if (currentPlayer === 'white') {
            whiteTimer.classList.add('active');
            blackTimer.classList.remove('active');
        } else {
            blackTimer.classList.add('active');
            whiteTimer.classList.remove('active');
        }
        
        // Check for game-ending conditions
        if (isCheckmate(currentPlayer)) {
            const winner = currentPlayer === 'white' ? 'Black' : 'White';
            statusDisplay.textContent = `${winner} wins by checkmate!`;
            isGameOver = true;
            playSound(gameEndSound);
            return;
        } else if (isStalemate(currentPlayer)) {
            statusDisplay.textContent = 'Game ends in stalemate!';
            isGameOver = true;
            playSound(gameEndSound);
            return;
        }
        
        // Update status text
        updateStatus();
        
        // Highlight king if in check
        updateCheckHighlight();
        
        // Request computer move if it's computer's turn
        if (isComputerOpponent && currentPlayer === 'black' && !isGameOver) {
            // If we're on a mobile device or experiencing delays, ensure a move happens
            // by using a safety timeout
            const ensureMoveTimeout = setTimeout(() => {
                if (isComputerOpponent && currentPlayer === 'black' && !isGameOver && !isComputerThinking) {
                    console.log("Safety timeout: AI move not requested yet, forcing request");
                    requestComputerMove();
                }
            }, 500);
            
            // Regular move request with a very small delay to let UI update
            setTimeout(() => {
                requestComputerMove();
                clearTimeout(ensureMoveTimeout);
            }, 50);
        }
    }
    
    function updateStatus() {
        if (isGameOver) return;
        
        if (isInCheck) {
            const kingPosition = findKing(currentPlayer);
            let possibleEscapes = 0;
            
            // Count possible king moves to escape check
            if (kingPosition) {
                for (let r = Math.max(0, kingPosition.row - 1); r <= Math.min(7, kingPosition.row + 1); r++) {
                    for (let c = Math.max(0, kingPosition.col - 1); c <= Math.min(7, kingPosition.col + 1); c++) {
                        // Skip the current king position
                        if (r === kingPosition.row && c === kingPosition.col) continue;
                        
                        // Skip squares with friendly pieces
                        if (gameBoard[r][c] && gameBoard[r][c].color === currentPlayer) continue;
                        
                        // Check if this move would be valid
                        if (isValidKingMove(kingPosition.row, kingPosition.col, r, c)) {
                            possibleEscapes++;
                        }
                    }
                }
            }
            
            console.log(`${currentPlayer} king has ${possibleEscapes} possible escape moves`);
            statusDisplay.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in check! (${possibleEscapes} escape moves)`;
        } else {
            statusDisplay.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
        }
    }
    
    function resetGame() {
        console.log("Resetting game...");
        
        // Clear any pause state
        isPaused = false;
        pauseOverlay.style.display = 'none';
        pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Store current game mode before resetting
        const playingWithComputer = isComputerOpponent;
        
        // Clean up
        if (stockfishWorker) {
            try {
                stockfishWorker.postMessage({ type: 'quit' });
                stockfishWorker = null;
            } catch (e) {
                console.error("Error cleaning up stockfish:", e);
            }
        }
        
        // Reset game state
        gameBoard = createBoard();
        selectedPiece = null;
        currentPlayer = 'white';
        isGameOver = false;
        isInCheck = false;
        isComputerThinking = false;
        
        // Clear any timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Remove all visual indicators
        whiteTimer.classList.remove('active', 'warning', 'thinking');
        blackTimer.classList.remove('active', 'warning', 'thinking');
        
        // Clear all board highlights
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('check', 'selected', 'highlight', 'escape-square');
        });
        
        // Restore game mode
        isComputerOpponent = playingWithComputer;
        
        // Update display
        renderBoard();
        updateStatus();
        
        // Reset timer display
        remainingTime = moveTimeLimit;
        whiteTimer.textContent = formatTime(remainingTime);
        blackTimer.textContent = formatTime(remainingTime);
        
        // If playing against computer, initialize a new worker
        if (isComputerOpponent && !stockfishWorker) {
            console.log("Reinitializing computer opponent");
            // We're now using the simple AI directly so no need to reinitialize Stockfish
            // initStockfish(); 
        }
        
        // Start timer after everything is set up - this will also trigger computer move if needed
        whiteTimer.classList.add('active');
        
        // Start a fresh timer
        startTimer();
        
        // Play game start sound
        playSound(gameStartSound);
        
        console.log("Game reset complete");
    }
    
    // Helper function to play sounds safely
    function playSound(sound) {
        try {
            if (sound && sound.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                sound.currentTime = 0;
                sound.play().catch(e => console.log("Sound play failed:", e));
            }
        } catch (e) {
            console.log("Error playing sound:", e);
        }
    }
    
    // Helper function to check if the path is clear (for rook, bishop, queen)
    function checkClearPath(startRow, startCol, endRow, endCol, board) {
        // No need to check if the piece is on the same square
        if (startRow === endRow && startCol === endCol) return true;
        
        // Determine the direction of movement
        const rowStep = startRow === endRow ? 0 : (startRow < endRow ? 1 : -1);
        const colStep = startCol === endCol ? 0 : (startCol < endCol ? 1 : -1);
        
        let row = startRow + rowStep;
        let col = startCol + colStep;
        
        // Check each square in the path until we reach the end (exclusive of the end square)
        while (row !== endRow || col !== endCol) {
            if (board[row][col]) return false; // Path is blocked
            row += rowStep;
            col += colStep;
        }
        
        // For attack detection, we want to return true even if there's an opponent's piece at the end
        // (because that piece can be captured), but we need to know the end square is reachable
        return true;
    }
    
    // Add pause game functionality
    function pauseGame() {
        if (isGameOver || isPaused) return;
        
        isPaused = true;
        
        // Stop the timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Show the pause overlay
        pauseOverlay.style.display = 'flex';
        
        // Update button text
        pauseButton.innerHTML = '<i class="fas fa-play"></i>';
        
        console.log("Game paused");
    }
    
    function resumeGame() {
        if (isGameOver || !isPaused) return;
        
        isPaused = false;
        
        // Hide the pause overlay
        pauseOverlay.style.display = 'none';
        
        // Update button text
        pauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Restart the timer
        startTimer();
        
        console.log("Game resumed");
    }
    
    function togglePauseResume() {
        if (isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
    
    // Add multiplayer event listeners
    function setupMultiplayerEventListeners() {
        const multiplayerBtn = document.getElementById('multiplayer-btn');
        const multiplayerDialog = document.getElementById('multiplayer-dialog');
        const createRoomBtn = document.getElementById('create-room-btn');
        const joinRoomBtn = document.getElementById('join-room-btn');
        const joinWithCodeBtn = document.getElementById('join-with-code-btn');
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        const joinRoomForm = document.getElementById('join-room-form');
        const roomCodeInput = document.getElementById('room-code-input');
        
        // Show multiplayer options
        multiplayerBtn.addEventListener('click', () => {
            hideMenu();
            multiplayerDialog.style.display = 'flex';
        });
        
        // Create a new game room
        createRoomBtn.addEventListener('click', () => {
            multiplayerDialog.style.display = 'none';
            
            // Create room via multiplayer module
            window.multiplayerModule.createRoom((response) => {
                console.log('Room created:', response);
            });
        });
        
        // Show join room form
        joinRoomBtn.addEventListener('click', () => {
            joinRoomForm.style.display = 'block';
            roomCodeInput.focus();
        });
        
        // Join an existing room
        joinWithCodeBtn.addEventListener('click', () => {
            const code = roomCodeInput.value.trim().toUpperCase();
            
            if (code.length < 6) {
                showNotification('Please enter a valid room code', 'error');
                return;
            }
            
            multiplayerDialog.style.display = 'none';
            
            // Join room via multiplayer module
            window.multiplayerModule.joinRoom(code, (response) => {
                console.log('Room joined:', response);
            });
        });
        
        // Return to main menu
        backToMenuBtn.addEventListener('click', () => {
            multiplayerDialog.style.display = 'none';
            showMenu();
        });
        
        // Allow pressing Enter to join a room
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinWithCodeBtn.click();
            }
        });
    }
    
    // Helper function to show notifications (for multiplayer)
    function showNotification(message, type = 'info') {
        if (window.multiplayerModule) {
            // Use the multiplayer module's notification function
            const notificationFunc = window.multiplayerModule.showNotification || function(msg, t) {
                console.log(`Notification: ${msg} (${t})`);
            };
            notificationFunc(message, type);
        } else {
            // Fallback for when module isn't available
            console.log(`Notification: ${message} (${type})`);
            
            // Create a temporary notification element
            let notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }
});