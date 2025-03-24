# Chess Game

A simple chess game built with HTML, CSS, and JavaScript.

## Features

- Complete chess board with all pieces
- Two game modes:
  - Player vs Player (local)
  - Player vs Computer (using Stockfish chess engine)
- Visual highlighting of selected pieces and valid moves with small circles
- Turn-based gameplay (white goes first)
- Advanced chess rules implementation:
  - Check detection and visualization
  - Checkmate detection with game-over state
  - Stalemate detection
  - Prevention of moves that would put your own king in check
  - Castling (kingside and queenside)
  - Pawn promotion to queen
- Move timer (60 seconds per move) with timeout victory condition
- Main menu interface
- Sound effects for moves, captures, checks, and game events
- Reset game functionality
- Fullscreen mode (double-click anywhere to toggle)
- Responsive design

## How to Play

1. From the main menu, choose a game mode:
   - Player vs Player: Play against another person on the same device
   - Player vs Computer: Play against the Stockfish chess engine
2. Click on a piece to select it
3. Valid moves will be shown with small green circles
4. Click on a highlighted position to move the piece
5. Take turns between white and black
   - When playing against the computer, you control the white pieces
   - The computer will automatically make its move after you play
6. Each player has 60 seconds to make a move, indicated by the timer
7. If a player doesn't move within the time limit, the opponent wins
8. When a king is in check, it will be highlighted in red
9. The game ends when there's a checkmate, stalemate, or timeout
10. Click "Reset Game" to start over or "Main Menu" to return to the menu
11. Double-click anywhere to toggle fullscreen mode

## Computer Opponent

The computer opponent uses the Stockfish chess engine, one of the strongest open-source chess engines available. When playing against the computer:

- You always play as white
- The computer's thinking is indicated by a pulsing orange timer
- The computer's skill level can be adjusted by changing the search depth in the code
- The computer plays instantly at lower difficulty settings, but may take a few seconds to move at higher settings

## Sound Effects

The game includes sound effects for:
- Moving pieces
- Capturing opponent pieces
- Check situations
- Starting a new game
- Game ending (checkmate, stalemate, or timeout)

## Implementation Details

- Pure HTML, CSS and JavaScript (no frameworks or libraries)
- Uses Stockfish.js chess engine for the computer opponent
- Unicode chess symbols for pieces
- Grid-based board layout
- Piece-specific movement validation
- Check and checkmate detection
- Move validation to prevent illegal moves
- Audio integration
- Timed moves with visual feedback

## Missing Features

This implementation doesn't include:
- En passant captures
- Draw by repetition
- Move history/notation
- Choice of time controls
- Piece selection for pawn promotion (always promotes to queen)
- Choosing sides (white/black) when playing against the computer

## Setup

1. Place sound files in the `sounds` directory with the following names:
   - move.mp3
   - capture.mp3
   - check.mp3
   - game-start.mp3
   - game-end.mp3

Feel free to enhance the game with additional features! 