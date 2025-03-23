document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const board = document.getElementById('board');
    const statusDisplay = document.getElementById('status');
    const resetButton = document.getElementById('reset-btn');
    const menuButton = document.getElementById('menu-btn');
    const menuOverlay = document.getElementById('menu-overlay');
    const startButton = document.getElementById('start-btn');
    
    // Sound Elements
    const moveSound = document.getElementById('move-sound');
    const captureSound = document.getElementById('capture-sound');
    const checkSound = document.getElementById('check-sound');
    const gameStartSound = document.getElementById('game-start-sound');
    const gameEndSound = document.getElementById('game-end-sound');
    
    // Game state
    let selectedPiece = null;
    let currentPlayer = 'white';
    let gameBoard = createBoard();
    let isGameOver = false;
    let isInCheck = false;
    
    // Show menu on load
    showMenu();
    
    // Setup event listeners immediately
    setupEventListeners();
    
    // Initialize the game
    function initializeGame() {
        gameBoard = createBoard();
        selectedPiece = null;
        currentPlayer = 'white';
        isGameOver = false;
        isInCheck = false;
        renderBoard();
        updateStatus();
        
        // Play game start sound
        playSound(gameStartSound);
    }
    
    function showMenu() {
        menuOverlay.style.display = 'flex';
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

        // Highlight king in check
        if (isInCheck) {
            // The player who's in check is the current player
            const kingPosition = findKing(currentPlayer);
            if (kingPosition) {
                const kingSquare = document.querySelector(`.square[data-row="${kingPosition.row}"][data-col="${kingPosition.col}"]`);
                kingSquare.classList.add('check');
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
        // Game board and control buttons
        board.addEventListener('click', handleSquareClick);
        resetButton.addEventListener('click', resetGame);
        
        // Menu buttons
        startButton.addEventListener('click', () => {
            hideMenu();
            initializeGame();
        });
        
        menuButton.addEventListener('click', () => {
            showMenu();
        });
        
        // Fullscreen
        document.addEventListener('fullscreenchange', updateBoardSize);
        document.addEventListener('webkitfullscreenchange', updateBoardSize);
        document.addEventListener('mozfullscreenchange', updateBoardSize);
        document.addEventListener('MSFullscreenChange', updateBoardSize);
        
        // Add fullscreen toggle button event
        const container = document.querySelector('.container');
        container.addEventListener('dblclick', toggleFullScreen);
    }
    
    function toggleFullScreen() {
        if (!document.fullscreenElement &&
            !document.mozFullScreenElement &&
            !document.webkitFullscreenElement &&
            !document.msFullscreenElement) {
            // Enter fullscreen
            const container = document.querySelector('.container');
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            } else if (container.mozRequestFullScreen) {
                container.mozRequestFullScreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }
    
    function updateBoardSize() {
        const container = document.querySelector('.container');
        if (document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement) {
            container.classList.add('fullscreen');
        } else {
            container.classList.remove('fullscreen');
        }
    }
    
    function handleSquareClick(event) {
        if (isGameOver) return;
        
        const squareElement = event.target.closest('.square');
        if (!squareElement) return;
        
        const row = parseInt(squareElement.dataset.row);
        const col = parseInt(squareElement.dataset.col);
        
        // Clear previous highlights
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
                if (isValidMove(startRow, startCol, row, col)) {
                    // Test if this move would put/leave own king in check
                    const testBoard = JSON.parse(JSON.stringify(gameBoard));
                    testBoard[row][col] = testBoard[startRow][startCol];
                    testBoard[startRow][startCol] = null;
                    
                    if (!isKingInCheck(currentPlayer, testBoard)) {
                        const isCapture = gameBoard[row][col] !== null;
                        
                        movePiece(startRow, startCol, row, col);
                        selectedPiece = null;
                        
                        // Play sound for move or capture
                        if (isCapture) {
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
        
        // Special handling for king castling
        if (piece.type === 'king' && !piece.hasMoved && !isPlayerInCheck) {
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
                    testBoard[row][col] = null;
                    testBoard[row][col + 1] = piece;
                    
                    if (isSquareAttacked(row, col + 1, piece.color === 'white' ? 'black' : 'white', testBoard)) {
                        pathSafe = false;
                    }
                    
                    // If path is safe, highlight the castling destination
                    if (pathSafe) {
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
                    testBoard[row][col] = null;
                    testBoard[row][col - 1] = piece;
                    
                    if (isSquareAttacked(row, col - 1, piece.color === 'white' ? 'black' : 'white', testBoard)) {
                        pathSafe = false;
                    }
                    
                    // If path is safe, highlight the castling destination
                    if (pathSafe) {
                        const castleSquare = document.querySelector(`.square[data-row="${row}"][data-col="${col - 2}"]`);
                        castleSquare.classList.add('highlight', 'castle-move');
                    }
                }
            }
        }
        
        // Continue with normal move highlighting
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
                    testBoard[r][c] = testBoard[row][col];
                    testBoard[row][col] = null;
                    
                    // Only highlight the move if it doesn't leave the king in check
                    if (!isKingInCheck(piece.color, testBoard)) {
                        const squareElement = document.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
                        squareElement.classList.add('highlight');
                    }
                }
            }
        }
    }
    
    function clearHighlights() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            square.classList.remove('selected', 'highlight', 'check');
        });
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
        
        // Regular king move: one square in any direction
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        
        if (rowDiff <= 1 && colDiff <= 1) {
            return true;
        }
        
        // Check for castling
        if (startRow === endRow && !king.hasMoved && !isKingInCheck(king.color, gameBoard)) {
            // Kingside castling (to the right)
            if (endCol === startCol + 2) {
                // Check rook presence and movement history
                const rookCol = 7;
                const rook = gameBoard[startRow][rookCol];
                if (!rook || rook.type !== 'rook' || rook.color !== king.color || rook.hasMoved) {
                    return false;
                }
                
                // Check if squares between king and rook are empty
                for (let col = startCol + 1; col < rookCol; col++) {
                    if (gameBoard[startRow][col] !== null) {
                        return false;
                    }
                }
                
                // Check if king passes through a square under attack
                const testBoard = JSON.parse(JSON.stringify(gameBoard));
                // Check if the square the king passes through is under attack
                testBoard[startRow][startCol] = null;
                testBoard[startRow][startCol + 1] = king;
                if (isSquareAttacked(startRow, startCol + 1, king.color === 'white' ? 'black' : 'white', testBoard)) {
                    return false;
                }
                
                return true;
            }
            
            // Queenside castling (to the left)
            if (endCol === startCol - 2) {
                // Check rook presence and movement history
                const rookCol = 0;
                const rook = gameBoard[startRow][rookCol];
                if (!rook || rook.type !== 'rook' || rook.color !== king.color || rook.hasMoved) {
                    return false;
                }
                
                // Check if squares between king and rook are empty
                for (let col = startCol - 1; col > rookCol; col--) {
                    if (gameBoard[startRow][col] !== null) {
                        return false;
                    }
                }
                
                // Check if king passes through a square under attack
                const testBoard = JSON.parse(JSON.stringify(gameBoard));
                // Check if the square the king passes through is under attack
                testBoard[startRow][startCol] = null;
                testBoard[startRow][startCol - 1] = king;
                if (isSquareAttacked(startRow, startCol - 1, king.color === 'white' ? 'black' : 'white', testBoard)) {
                    return false;
                }
                
                return true;
            }
        }
        
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
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === attackerColor) {
                    // Use the same move validation but ignore king in check for this calculation
                    // to avoid infinite recursion
                    let validMove = false;
                    
                    switch (piece.type) {
                        case 'pawn':
                            // Pawns attack diagonally
                            const direction = piece.color === 'white' ? -1 : 1;
                            validMove = Math.abs(c - col) === 1 && row === r + direction;
                            break;
                        case 'rook':
                            validMove = (r === row || c === col) && checkClearPath(r, c, row, col, board);
                            break;
                        case 'knight':
                            // Knight moves in an L-shape: 2 squares in one direction and 1 square perpendicular
                            const rowDiff = Math.abs(r - row);
                            const colDiff = Math.abs(c - col);
                            validMove = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
                            break;
                        case 'bishop':
                            validMove = Math.abs(r - row) === Math.abs(c - col) && checkClearPath(r, c, row, col, board);
                            break;
                        case 'queen':
                            validMove = ((r === row || c === col) || (Math.abs(r - row) === Math.abs(c - col))) 
                                        && checkClearPath(r, c, row, col, board);
                            break;
                        case 'king':
                            // King attacks adjacent squares
                            const kingRowDiff = Math.abs(r - row);
                            const kingColDiff = Math.abs(c - col);
                            validMove = kingRowDiff <= 1 && kingColDiff <= 1;
                            break;
                    }
                    
                    if (validMove) {
                        return true;
                    }
                }
            }
        }
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
        if (!piece) return false;
        
        // Try all possible destination squares
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                // Skip if same position
                if (row === r && col === c) continue;
                
                // Skip if destination has a piece of the same color
                if (board[r][c] && board[r][c].color === piece.color) continue;
                
                // Check if the move is valid according to piece movement rules
                if (isValidMove(row, col, r, c)) {
                    // Create a test board to see if this move would resolve the check
                    const testBoard = JSON.parse(JSON.stringify(board));
                    testBoard[r][c] = testBoard[row][col];
                    testBoard[row][col] = null;
                    
                    // If this move gets the king out of check, it's a legal move
                    if (!isKingInCheck(piece.color, testBoard)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    function isCheckmate(color) {
        // Check if the king is in check
        if (!isKingInCheck(color, gameBoard)) {
            return false;
        }
        
        // Check if any piece of the specified color can make a legal move
        // that would get the king out of check
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameBoard[row][col];
                if (piece && piece.color === color) {
                    // Try every possible move for this piece
                    if (canPieceMoveAnywhere(row, col, gameBoard)) {
                        return false; // Found at least one legal move
                    }
                }
            }
        }
        
        // If king is in check and no piece can make a legal move, it's checkmate
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
        const piece = gameBoard[startRow][startCol];
        
        // Handle castling for king
        if (piece.type === 'king' && Math.abs(startCol - endCol) === 2) {
            // Kingside castling
            if (endCol > startCol) {
                // Move rook from h-file to f-file
                const rookCol = 7;
                const rook = gameBoard[startRow][rookCol];
                gameBoard[startRow][endCol - 1] = rook; // Place rook on the square the king crossed
                gameBoard[startRow][rookCol] = null;    // Remove rook from original position
            } 
            // Queenside castling
            else {
                // Move rook from a-file to d-file
                const rookCol = 0;
                const rook = gameBoard[startRow][rookCol];
                gameBoard[startRow][endCol + 1] = rook; // Place rook on the square the king crossed
                gameBoard[startRow][rookCol] = null;    // Remove rook from original position
            }
        }
        
        // Update hasMoved property for kings and rooks
        if (piece.type === 'king' || piece.type === 'rook') {
            piece.hasMoved = true;
        }
        
        // Move the piece
        gameBoard[endRow][endCol] = piece;
        gameBoard[startRow][startCol] = null;
        
        // Handle pawn promotion (simplified - always promotes to queen)
        if (piece.type === 'pawn' && (endRow === 0 || endRow === 7)) {
            piece.type = 'queen';
        }
        
        // Re-render the board after moving
        renderBoard();
    }
    
    function switchTurn() {
        // Switch to the other player
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        
        // After switching turns, check if the new current player is in check
        isInCheck = isKingInCheck(currentPlayer, gameBoard);
        
        // Check for check sound
        if (isInCheck) {
            playSound(checkSound);
        }
        
        // Check for checkmate
        if (isInCheck && isCheckmate(currentPlayer)) {
            isGameOver = true;
            const winner = currentPlayer === 'white' ? 'Black' : 'White';
            statusDisplay.textContent = `${winner} wins by checkmate!`;
            playSound(gameEndSound);
            return;
        }
        
        // Check for stalemate
        if (!isInCheck && isStalemate(currentPlayer)) {
            isGameOver = true;
            statusDisplay.textContent = "Game ends in stalemate!";
            playSound(gameEndSound);
            return;
        }
        
        // Update the display
        updateStatus();
    }
    
    function updateStatus() {
        if (isGameOver) return;
        
        if (isInCheck) {
            statusDisplay.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in check!`;
        } else {
            statusDisplay.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
        }
    }
    
    function resetGame() {
        gameBoard = createBoard();
        selectedPiece = null;
        currentPlayer = 'white';
        isGameOver = false;
        isInCheck = false;
        renderBoard();
        updateStatus();
        
        // Play game start sound
        playSound(gameStartSound);
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
        
        return true;
    }
});