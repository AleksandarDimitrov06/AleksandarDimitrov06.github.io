// Chess utility functions for FEN notation and AI integration

/**
 * Convert internal board representation to FEN (Forsyth-Edwards Notation)
 * @param {Array} board - The 2D array representation of the board
 * @param {string} currentPlayer - Current player color ('white' or 'black')
 * @param {boolean} isInCheck - Whether the current player is in check
 * @returns {string} FEN string
 */
function boardToFen(board, currentPlayer, castlingRights = { white: { kingside: true, queenside: true }, black: { kingside: true, queenside: true } }) {
    let fen = '';
    
    // Board position
    for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            
            if (piece === null) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                
                let symbol = pieceToFenSymbol(piece);
                fen += symbol;
            }
        }
        
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        
        if (row < 7) {
            fen += '/';
        }
    }
    
    // Active color
    fen += ' ' + (currentPlayer === 'white' ? 'w' : 'b');
    
    // Castling availability
    let castling = '';
    if (castlingRights.white.kingside) castling += 'K';
    if (castlingRights.white.queenside) castling += 'Q';
    if (castlingRights.black.kingside) castling += 'k';
    if (castlingRights.black.queenside) castling += 'q';
    
    fen += ' ' + (castling || '-');
    
    // En passant target square (simplified for now)
    fen += ' -';
    
    // Halfmove clock (not tracked in our implementation)
    fen += ' 0';
    
    // Fullmove number (not tracked in our implementation)
    fen += ' 1';
    
    return fen;
}

/**
 * Convert piece object to FEN symbol
 * @param {Object} piece - Piece object with type and color
 * @returns {string} FEN symbol for the piece
 */
function pieceToFenSymbol(piece) {
    const symbols = {
        'white': {
            'pawn': 'P',
            'rook': 'R',
            'knight': 'N',
            'bishop': 'B',
            'queen': 'Q',
            'king': 'K'
        },
        'black': {
            'pawn': 'p',
            'rook': 'r',
            'knight': 'n',
            'bishop': 'b',
            'queen': 'q',
            'king': 'k'
        }
    };
    
    return symbols[piece.color][piece.type];
}

/**
 * Convert UCI format move (e.g., "e2e4") to board coordinates
 * @param {string} uciMove - Move in UCI format
 * @returns {Object} Object with start and end coordinates
 */
function uciToCoordinates(uciMove) {
    if (!uciMove || uciMove.length < 4) {
        return null;
    }
    
    // Parse the UCI move
    const fileFrom = uciMove.charCodeAt(0) - 'a'.charCodeAt(0);
    const rankFrom = 8 - parseInt(uciMove[1]);
    const fileTo = uciMove.charCodeAt(2) - 'a'.charCodeAt(0);
    const rankTo = 8 - parseInt(uciMove[3]);
    
    // Additional piece for promotion if move is like "e7e8q"
    const promotion = uciMove.length > 4 ? uciMove[4] : null;
    
    return {
        startRow: rankFrom,
        startCol: fileFrom,
        endRow: rankTo,
        endCol: fileTo,
        promotion: promotion
    };
}

/**
 * Convert board coordinates to UCI format
 * @param {number} startRow - Starting row
 * @param {number} startCol - Starting column
 * @param {number} endRow - Ending row
 * @param {number} endCol - Ending column
 * @returns {string} Move in UCI format
 */
function coordinatesToUci(startRow, startCol, endRow, endCol) {
    const fileFrom = String.fromCharCode('a'.charCodeAt(0) + startCol);
    const rankFrom = 8 - startRow;
    const fileTo = String.fromCharCode('a'.charCodeAt(0) + endCol);
    const rankTo = 8 - endRow;
    
    return `${fileFrom}${rankFrom}${fileTo}${rankTo}`;
}

/**
 * Get castling rights based on the board state
 * @param {Array} board - The chess board
 * @returns {Object} Castling rights object
 */
function getCastlingRights(board) {
    const castlingRights = {
        white: { kingside: false, queenside: false },
        black: { kingside: false, queenside: false }
    };
    
    // Check for white king and rooks
    const whiteKing = board[7][4];
    const whiteKingsideRook = board[7][7];
    const whiteQueensideRook = board[7][0];
    
    if (whiteKing && whiteKing.type === 'king' && whiteKing.color === 'white' && !whiteKing.hasMoved) {
        if (whiteKingsideRook && whiteKingsideRook.type === 'rook' && !whiteKingsideRook.hasMoved) {
            castlingRights.white.kingside = true;
        }
        if (whiteQueensideRook && whiteQueensideRook.type === 'rook' && !whiteQueensideRook.hasMoved) {
            castlingRights.white.queenside = true;
        }
    }
    
    // Check for black king and rooks
    const blackKing = board[0][4];
    const blackKingsideRook = board[0][7];
    const blackQueensideRook = board[0][0];
    
    if (blackKing && blackKing.type === 'king' && blackKing.color === 'black' && !blackKing.hasMoved) {
        if (blackKingsideRook && blackKingsideRook.type === 'rook' && !blackKingsideRook.hasMoved) {
            castlingRights.black.kingside = true;
        }
        if (blackQueensideRook && blackQueensideRook.type === 'rook' && !blackQueensideRook.hasMoved) {
            castlingRights.black.queenside = true;
        }
    }
    
    return castlingRights;
} 