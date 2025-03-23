# Chess Game

A simple chess game built with HTML, CSS, and JavaScript.

## Features

- Complete chess board with all pieces
- Visual highlighting of selected pieces and valid moves with small circles
- Turn-based gameplay (white goes first)
- Advanced chess rules implementation:
  - Check detection and visualization
  - Checkmate detection with game-over state
  - Stalemate detection
  - Prevention of moves that would put your own king in check
- Main menu interface
- Sound effects for moves, captures, checks, and game events
- Pawn promotion to queen
- Reset game functionality
- Fullscreen mode (double-click anywhere to toggle)
- Responsive design

## How to Play

1. Click the "Start New Game" button on the main menu
2. Click on a piece to select it
3. Valid moves will be shown with small green circles
4. Click on a highlighted position to move the piece
5. Take turns between white and black
6. When a king is in check, it will be highlighted in red
7. The game ends when there's a checkmate or stalemate
8. Click "Reset Game" to start over or "Main Menu" to return to the menu
9. Double-click anywhere to toggle fullscreen mode

## Sound Effects

The game includes sound effects for:
- Moving pieces
- Capturing opponent pieces
- Check situations
- Starting a new game
- Game ending (checkmate or stalemate)

## Implementation Details

- Pure HTML, CSS and JavaScript (no frameworks or libraries)
- Unicode chess symbols for pieces
- Grid-based board layout
- Piece-specific movement validation
- Check and checkmate detection
- Move validation to prevent illegal moves
- Audio integration

## Missing Features

This implementation doesn't include:
- Castling moves
- En passant captures
- Draw by repetition
- Move history/notation
- Time controls
- Piece selection for pawn promotion (always promotes to queen)

## Setup

1. Place sound files in the `sounds` directory with the following names:
   - move.mp3
   - capture.mp3
   - check.mp3
   - game-start.mp3
   - game-end.mp3

Feel free to enhance the game with additional features! 