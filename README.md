# Simple Multiplayer Server

TODO

## Events

### Client to Server

- **chat-message**
  - Sends a chat message to the current server lobby. Only possible, if the player is still in the lobby.
  - Data:
      - `message`: string
- **match-create**
  - Creates a new match with the given parameters.
  - Data:
      - `name`: string
      - `password`: string
      - `numPlayers` : integer
      - `isPrivate`: boolean
- **match-join**
  - Join the match with the given id.
  - Data:
    - `match`: string
    - `password`: string
- **match-leave**
  - Removes the current player from the currently active match. If the owner leaves, the match will get canceled.
- **match-start**
  - Marks the currently active match as started. Currently active match is stored on the server.
- **match-finish**
  - Marks the currently active match as finished. Currently active match is stored on the server.
- **player-kick** (Host only)
  - Kicks a player from the currently active match.
  - Data:
    - `player`: string
- **send-request** (Guests only)
  - Sends a request to the server, which will be forwarded to the host.
- **send-command** (Host only)
  - Sends a command to the server, which will be forwarded to all guests or a specific guest.

### Server to Client

- **server-message**
  - Sends a message from the server to all connected clients. Normally used for maintenance messages.
  - Data:
     - `message`: string
- **server-error**
  - General error message for a certain connected socket or for all sockets.
  - Data:
      - `message`: string
- **matches-updated**
    - Sends the current list of matches to all connected clients.
    - Data:
        - `matches`: array of matches
- **chat-message**
    - Sends a chat message to all connected clients in the lobby.
    - Data:
        - `player`: string
        - `message`: string
- **player-joined**
    - Sends a message to all connected clients in the currently active match, that a player has joined.
    - Data:
        - `player`: string
- **player-left**
    - Sends a message to all connected clients in the currently active match, that a player has left.
    - Data:
        - `player`: string
- **match-started**
    - Sends a message to all connected clients in the currently active match, that the match has started.
- **match-finished**
    - Sends a message to all connected clients in the currently active match, that the match has finished.
- **match-canceled**
    - Sends a message to all connected clients in the currently active match, that the match has been canceled.
- **receive-request** (Host only)
  - Triggered when a request is received from a guest. The host will determine if the request is valid.
- **receive-command** (Guests only)
  - Triggered when a command is received from the host. The guest will execute the command.
