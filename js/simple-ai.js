/**
 * Simple Chess AI
 * 
 * This provides a basic AI for chess when the Stockfish engine isn't available.
 * It uses a simple piece value evaluation and random move selection.
 */

// Piece values for evaluation
const PIECE_VALUES = {
    'pawn': 1,
    'knight': 3,
    'bishop': 3.25, // Slight increase for bishop
    'rook': 5,
    'queen': 9,
    'king': 0 // King won't be captured, so its material value is less important
};

// Position bonus for medium difficulty - enhanced from original
const POSITION_BONUS = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.2, 0.3, 0.3, 0.3, 0.3, 0.2, 0.0],
    [0.0, 0.3, 0.4, 0.5, 0.5, 0.4, 0.3, 0.0],
    [0.0, 0.3, 0.5, 0.6, 0.6, 0.5, 0.3, 0.0],
    [0.0, 0.3, 0.5, 0.6, 0.6, 0.5, 0.3, 0.0],
    [0.0, 0.3, 0.4, 0.5, 0.5, 0.4, 0.3, 0.0],
    [0.0, 0.2, 0.3, 0.3, 0.3, 0.3, 0.2, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
];

// Advanced position-based piece values for hard difficulty
const ADVANCED_PAWN_BONUS = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
    [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
    [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
    [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
    [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
];

const ADVANCED_KNIGHT_BONUS = [
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
    [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
    [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
    [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
    [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
    [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
    [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
];

const ADVANCED_BISHOP_BONUS = [
    [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
    [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
    [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
    [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
    [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
    [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];

const ADVANCED_ROOK_BONUS = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0]
];

const ADVANCED_QUEEN_BONUS = [
    [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
    [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
    [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
    [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];

const ADVANCED_KING_BONUS = [
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
    [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
    [2.0, 3.0, 1.0, 0.0, 0.0, 1.0, 3.0, 2.0]
];

// A function to get advanced position bonus for a piece
function getAdvancedPositionBonus(piece, row, col, playerColor) {
    let bonusMatrix;
    
    switch(piece.type) {
        case 'pawn':
            bonusMatrix = ADVANCED_PAWN_BONUS;
            break;
        case 'knight':
            bonusMatrix = ADVANCED_KNIGHT_BONUS;
            break;
        case 'bishop':
            bonusMatrix = ADVANCED_BISHOP_BONUS;
            break;
        case 'rook':
            bonusMatrix = ADVANCED_ROOK_BONUS;
            break;
        case 'queen':
            bonusMatrix = ADVANCED_QUEEN_BONUS;
            break;
        case 'king':
            bonusMatrix = ADVANCED_KING_BONUS;
            break;
        default:
            return 0;
    }
    
    // Flip the row for black pieces to use same position tables
    if (playerColor === 'black') {
        return bonusMatrix[row][col] / 10;
    } else {
        return bonusMatrix[7 - row][col] / 10;
    }
}

/**
 * Find the best move for a player using a simple evaluation function
 * @param {Array} board - The current game board
 * @param {string} playerColor - Color of the player ('white' or 'black')
 * @param {Function} isValidMoveFn - Function to check if a move is valid
 * @param {Function} movePieceFn - Function to make a move on a test board
 * @param {Function} isKingInCheckFn - Function to check if king is in check
 * @param {string} difficulty - Difficulty level ('easy', 'medium', or 'hard')
 * @returns {Object|null} Best move or null if no moves available
 */
function findBestMove(board, playerColor, isValidMoveFn, movePieceFn, isKingInCheckFn, difficulty = 'medium') {
    console.log(`Simple AI is calculating a move with ${difficulty} difficulty...`);
    
    // Get all possible moves for the player
    const possibleMoves = [];
    
    // Keep track of opponent's king for check detection
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    let opponentKingPosition = null;
    
    // Find opponent's king position
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const p = board[row][col];
            if (p && p.type === 'king' && p.color === opponentColor) {
                opponentKingPosition = { row, col };
                break;
            }
        }
        if (opponentKingPosition) break;
    }
    
    // Loop through all positions on the board
    for (let startRow = 0; startRow < 8; startRow++) {
        for (let startCol = 0; startCol < 8; startCol++) {
            const piece = board[startRow][startCol];
            
            // If there's a piece of the player's color
            if (piece && piece.color === playerColor) {
                // Loop through all possible destination squares
                for (let endRow = 0; endRow < 8; endRow++) {
                    for (let endCol = 0; endCol < 8; endCol++) {
                        try {
                            // Skip same position
                            if (startRow === endRow && startCol === endCol) continue;
                            
                            // Skip if destination has a piece of the same color
                            if (board[endRow][endCol] && board[endRow][endCol].color === playerColor) continue;

                            // Check if the move is valid
                            if (isValidMoveFn(startRow, startCol, endRow, endCol)) {
                                // Check if the move would leave the king in check
                                const testBoard = JSON.parse(JSON.stringify(board));
                                movePieceFn(testBoard, startRow, startCol, endRow, endCol);
                                
                                // Only consider moves that don't leave the king in check
                                if (!isKingInCheckFn(playerColor, testBoard)) {
                                    // Calculate value of move
                                    let moveValue = 0;
                                    
                                    // If it's a capture, add the value of the captured piece
                                    const targetPiece = board[endRow][endCol];
                                    if (targetPiece && targetPiece.color !== playerColor) {
                                        moveValue += PIECE_VALUES[targetPiece.type] * 10; // Prioritize captures
                                    }
                                    
                                    // Add position bonus based on difficulty
                                    if (difficulty === 'hard') {
                                        // Use advanced position evaluation
                                        moveValue += getAdvancedPositionBonus(piece, endRow, endCol, playerColor) * 4; // Increase multiplier
                                        
                                        // Check if this move puts opponent in check (aggressive play)
                                        if (isKingInCheckFn(opponentColor, testBoard)) {
                                            moveValue += 3; // Increased bonus for check
                                        }
                                        
                                        // Bonus for controlling central squares
                                        if ((endRow >= 2 && endRow <= 5) && (endCol >= 2 && endCol <= 5)) {
                                            moveValue += 0.5;
                                        }
                                        
                                        // Give pawn promotion a big bonus
                                        if (piece.type === 'pawn' && (endRow === 0 || endRow === 7)) {
                                            moveValue += 10; // Increased bonus for promotion
                                        }
                                        
                                        // Add a bonus for developing pieces in the opening
                                        if (piece.type === 'knight' || piece.type === 'bishop') {
                                            // Check if the piece is still in its starting position
                                            const isStartingPosition = 
                                                (playerColor === 'white' && startRow === 7) || 
                                                (playerColor === 'black' && startRow === 0);
                                            
                                            if (isStartingPosition) {
                                                moveValue += 0.8; // Bonus for developing pieces
                                            }
                                        }
                                    } else if (difficulty === 'medium') {
                                        // Use standard position bonus
                                        moveValue += POSITION_BONUS[endRow][endCol] * 1.5; // Increased multiplier
                                        
                                        // Bonus for castling
                                        if (piece.type === 'king' && Math.abs(startCol - endCol) === 2) {
                                            moveValue += 3; // Increased bonus
                                        }
                                        
                                        // Give check a small bonus
                                        if (isKingInCheckFn(opponentColor, testBoard)) {
                                            moveValue += 1;
                                        }
                                    } else {
                                        // Easy difficulty - some position evaluation
                                        moveValue += POSITION_BONUS[endRow][endCol] * 0.7; // Slightly higher
                                    }
                                    
                                    // Add move to list of possible moves
                                    possibleMoves.push({
                                        startRow,
                                        startCol,
                                        endRow,
                                        endCol,
                                        value: moveValue,
                                        piece: piece.type
                                    });
                                }
                            }
                        } catch (e) {
                            console.error(`Error evaluating move from ${startRow},${startCol} to ${endRow},${endCol}:`, e);
                        }
                    }
                }
            }
        }
    }
    
    // If no valid moves, return null
    if (possibleMoves.length === 0) {
        console.log("Simple AI found no valid moves");
        return null;
    }
    
    console.log(`Simple AI found ${possibleMoves.length} possible moves`);
    
    // Add a random factor based on difficulty level (reduced randomness)
    let randomnessFactor = 0.4; // Medium (reduced from 0.5)
    
    if (difficulty === 'easy') {
        randomnessFactor = 1.0; // Reduced from 1.5 but still makes mistakes
    } else if (difficulty === 'hard') {
        randomnessFactor = 0.01; // Minimal randomness (reduced from 0.05)
    }
    
    possibleMoves.forEach(move => {
        move.value += Math.random() * randomnessFactor;
    });
    
    // Sort moves by value (descending)
    possibleMoves.sort((a, b) => b.value - a.value);
    
    // For hard difficulty, look at the top 3 moves and pick the best strategically
    // For medium, pick from the top 2 moves (reduced from top 3)
    // For easy, pick randomly from better moves
    let bestMove;
    
    if (difficulty === 'hard' && possibleMoves.length > 1) {
        bestMove = possibleMoves[0]; // Just take the highest value
    } else if (difficulty === 'medium' && possibleMoves.length > 2) {
        // Choose randomly among the top 2 moves (reduced from 3)
        const index = Math.floor(Math.random() * Math.min(2, possibleMoves.length));
        bestMove = possibleMoves[index];
    } else if (difficulty === 'easy' && possibleMoves.length > 3) {
        // Don't pick the absolute worst moves, but be very random
        const threshold = possibleMoves[0].value * 0.4; // 40% of best move value (increased from 30%)
        const viableMoves = possibleMoves.filter(move => move.value >= threshold);
        const index = Math.floor(Math.random() * viableMoves.length);
        bestMove = viableMoves[index];
    } else {
        // If few moves available, just pick the best
        bestMove = possibleMoves[0];
    }
    
    console.log("Best move selected:", bestMove);
    
    return bestMove;
}

/**
 * Helper function to make a move on a board
 * @param {Array} board - The board to modify
 * @param {number} startRow - Starting row
 * @param {number} startCol - Starting column
 * @param {number} endRow - Ending row
 * @param {number} endCol - Ending column
 */
function movePieceOnBoard(board, startRow, startCol, endRow, endCol) {
    const piece = board[startRow][startCol];
    if (!piece) return;
    
    // Handle castling (simplified)
    if (piece.type === 'king' && Math.abs(startCol - endCol) === 2) {
        const rookCol = endCol > startCol ? 7 : 0;
        const rookNewCol = endCol > startCol ? endCol - 1 : endCol + 1;
        
        // Move the rook
        board[startRow][rookNewCol] = board[startRow][rookCol];
        board[startRow][rookCol] = null;
        
        // Mark as moved
        if (board[startRow][rookNewCol]) {
            board[startRow][rookNewCol].hasMoved = true;
        }
    }
    
    // Mark kings and rooks as moved
    if (piece.type === 'king' || piece.type === 'rook') {
        piece.hasMoved = true;
    }
    
    // Move the piece
    board[endRow][endCol] = piece;
    board[startRow][startCol] = null;
    
    // Handle pawn promotion (always to queen)
    if (piece.type === 'pawn' && (endRow === 0 || endRow === 7)) {
        piece.type = 'queen';
    }
} 