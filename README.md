# Chess Master

A feature-rich Chess game with peer-to-peer multiplayer functionality - no server required!

## Features

- Local 2-player mode
- Computer opponent with adjustable difficulty (Easy, Medium, Hard)
- Peer-to-peer online multiplayer via WebRTC - no server needed!
- Shareable game links
- In-game chat with your opponent
- Responsive design for desktop and mobile devices
- Timer for each player
- Beautiful UI with sound effects

## Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or later)

### Installation Steps

1. Clone or download this repository
2. Open a terminal/command prompt in the project folder
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Access the game:
   - Local: http://localhost:3000
   - LAN: http://[your-ip-address]:3000

## How to Play

### Local Play

- Choose "Player vs Player (Local)" for 2 players on the same device
- Choose "Player vs Computer" to play against the AI
- Adjust the difficulty level as desired

### Online Multiplayer

1. **Create a Game**:
   - Click "Online Multiplayer"
   - Select "Create Game"
   - Share the game using either:
     - Send the shareable link directly to your friend
     - Copy the room code and share it

2. **Join a Game**:
   - If you received a link: Simply click it to join
   - If you received a code:
     - Click "Online Multiplayer"
     - Select "Join Game"
     - Enter the code
     - Click "Join"

3. **Playing Online**:
   - The game creator plays as White (first move)
   - The joining player plays as Black
   - Use the in-game chat to communicate with your opponent
   - The board is automatically disabled when it's not your turn

## No Server Required!

The multiplayer feature uses WebRTC for direct peer-to-peer connections:

- Players connect directly to each other without a dedicated game server
- Only a small signaling server is used for initial connection setup
- Once connected, all game data flows directly between players
- Your moves never go through a server, reducing latency

## Game Rules

- Standard chess rules apply
- Castling, en passant, and pawn promotion are all implemented
- Checkmate and stalemate detection are included

## Technical Information

The game uses:
- WebRTC for peer-to-peer connections
- A minimal signaling server (hosted on Glitch.com)
- Browser's Clipboard API for easy link sharing

## Development

For development with auto-restart:
```
npm run dev
```

## Troubleshooting

- **Cannot Connect**: Try refreshing and rejoining. Ensure your browser supports WebRTC.
- **Friend Cannot Join**: Make sure you're sharing the correct link or code.
- **Connection Lost**: If you lose connection, both players need to start a new game.
- **No Chat Appearing**: Some corporate networks block WebRTC - try on a different network.

## License

This project is open source and available for personal use and modification. 