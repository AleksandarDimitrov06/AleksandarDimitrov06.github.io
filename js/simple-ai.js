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
    'bishop': 3,
    'rook': 5,
    'queen': 9,
    'king': 0 // King won't be captured, so its material value is less important
};

// Simple position bonus to make the AI move pieces toward the center
const POSITION_BONUS = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0.0],
    [0.0, 0.2, 0.3, 0.4, 0.4, 0.3, 0.2, 0.0],
    [0.0, 0.2, 0.4, 0.5, 0.5, 0.4, 0.2, 0.0],
    [0.0, 0.2, 0.4, 0.5, 0.5, 0.4, 0.2, 0.0],
    [0.0, 0.2, 0.3, 0.4, 0.4, 0.3, 0.2, 0.0],
    [0.0, 0.1, 0.2, 0.2, 0.2, 0.2, 0.1, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
];

/**
 * Find the best move for a player using a simple evaluation function
 * @param {Array} board - The current game board
 * @param {string} playerColor - Color of the player ('white' or 'black')
 * @param {Function} isValidMoveFn - Function to check if a move is valid
 * @param {Function} movePieceFn - Function to make a move on a test board
 * @param {Function} isKingInCheckFn - Function to check if king is in check
 * @returns {Object|null} Best move or null if no moves available
 */
function findBestMove(board, playerColor, isValidMoveFn, movePieceFn, isKingInCheckFn) {
    console.log("Simple AI is calculating a move...");
    
    // Get all possible moves for the player
    const possibleMoves = [];
    
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
                                    
                                    // Add position bonus for the destination square
                                    moveValue += POSITION_BONUS[endRow][endCol];
                                    
                                    // Special case for castling - give it a bonus
                                    if (piece.type === 'king' && Math.abs(startCol - endCol) === 2) {
                                        moveValue += 2; // Bonus for castling
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
    
    // Add a small random factor to prevent predictable play
    possibleMoves.forEach(move => {
        move.value += Math.random() * 0.2;
    });
    
    // Sort moves by value (descending)
    possibleMoves.sort((a, b) => b.value - a.value);
    
    // Get the best move
    const bestMove = possibleMoves[0];
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