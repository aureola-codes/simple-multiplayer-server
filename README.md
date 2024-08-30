# Simple Multiplayer Server

## Installation

Copy the `.env.example` file to `.env` and adjust the configuration to your needs.

```bash
cp .env.example .env
```

### Local / Development

Prerequisites: [Node.js](https://nodejs.org/en/), [nodemon](https://nodemon.io/)

1. Clone the repository or download the source code.
2. Run `npm install` in the root directory of the project.
3. Run `npm start` to start the server.
4. The websocket will be available at `ws://localhost:9000`.

### Docker

Prerequisites: [Docker](https://www.docker.com/)

1. Clone the repository or download the source code.
2. Run `docker compose up --build` in the root directory of the project.
3. The websocket will be available at `ws://localhost:9000`.

## Configuration

To configure the server, edit the `.env` file in the root directory.

The following configuration options are available:

- `PORT`: The port that the websocket server will be served on. (default: `9000`)
- `AUTH_TOKEN`: An auth token used to authenticate the handshake request. (default: `""`)
- `MAX_PLAYERS`: Maximum number of players that can be connected to the server. (default: `1000`)
- `MAX_MATCHES`: Maximum number of matches that can be active on the server. (default: `100`)
- `MAX_PLAYERS_PER_MATCH`: Maximum number of players per match. (default: `10`)
- `CHAT_MIN_LENGTH`: Minimum length of chat messages. (default: `1`)
- `CHAT_MAX_LENGTH`: Maximum length of chat messages. (default: `256`)
- `MATCH_NAME_MIN_LENGTH`: Minimum length of match names. (default: `1`)
- `MATCH_NAME_MAX_LENGTH`: Maximum length of match names. (default: `32`)
- `MATCH_PASSWORD_MIN_LENGTH`: Minimum length of match passwords. (default: `8`)
- `MATCH_PASSWORD_MAX_LENGTH`: Maximum length of match passwords. (default: `32`)
- `PLAYER_NAME_MIN_LENGTH`: Minimum length of player names. (default: `1`)
- `PLAYER_NAME_MAX_LENGTH`: Maximum length of player names. (default: `32`)

You can find an `.env.example` file in the root directory of the project.

## Events

### Client -> Server

Events that can be sent from the client to the server.

#### Event: `chat-message`

Send a chat message to the server. The message will be broadcasted to all players 
in the same match or lobby as the sender. Messages will not be stored on the server.

Messages that are too short will be dropped. Messages that are too long will be truncated.

| Property  | Type                | Description                      |
|-----------|---------------------|----------------------------------|
| `message` | `string` `required` | The message that should be sent. |

**Important:** This event expects a single string parameter, not an object.

Example:
    
```javascript
// Send a chat message to the server
socket.emit('chat-message', 'Hello, World!');
``` 

#### Event: `status` (+ acknowledgment)

Requests the current status of the server. The server will respond with a status message.

Acknowledgment:

- Success: `callback(status: Status)`

Example:

```javascript
// Request the current status of the server
socket.emit('status', (status) => {
  console.log(status);
});
```

#### Event: `match-create` (+ acknowledgment)

Create a new match on the server. The player that creates the match will automatically join it.

| Property     | Type                 | Description                                            |
|--------------|----------------------|--------------------------------------------------------|
| `name`       | `string` `required`  | The name of the match.                                 |
| `password`   | `string` `optional`  | The password of the match, if it should be protected.  |
| `isPrivate`  | `boolean` `optional` | Whether the match should be private.                   |
| `maxPlayers` | `number` `optional`  | The maximum number of players that can join the match. |

Acknowledgment:

- Success: `callback(match: Match)`
- Failure: `callback(error: string)`

Example: 

```javascript
// Create a new match on the server
socket.emit('match-create', { name: 'My Match', maxPlayers: 4 }, (response) => {
  if (response.startsWith('ERROR:')) {
    console.error(response);
  } else {
    console.log('Match created:', response);
  }
});
```

#### Event: `match-join` (+ acknowledgment)

Join an existing match on the server. The player will be added to the match if it exists and is not full.

| Property   | Type                | Description                                    |
|------------|---------------------|------------------------------------------------|
| `match`    | `string` `required` | The unique identifier of the match.            |
| `password` | `string` `optional` | The password of the match, if it is protected. |

Acknowledgment:

- Success: `callback(match: Match)`
- Failure: `callback(error: string)`

Example:

```javascript
// Join an existing match on the server
socket.emit('match-join', { match: '1234' }, (response) => {
  if (response.startsWith('ERROR:')) {
    console.error(response);
  } else {
    console.log('Match joined:', response);
  }
});
```

#### Event: `match-leave`

Leave the current match. The player will be removed from the match and will be added to the lobby. If the player is the owner of the match, the match will be canceled.

Example:

```javascript
// Leave the current match
socket.emit('match-leave');
```

#### Event: `match-start`

Start the current match. The match will only start if the player is the owner of the match and the match is not already running.

Example:

```javascript
// Start the current match
socket.emit('match-start');
```

#### Event: `match-finish`

Finish the current match. The match will only finish if the player is the owner of the match and the match is running.

Example:

```javascript
// Finish the current match
socket.emit('match-finish');
```

#### Event: `player-update`

Update the player's data. The data will be broadcasted to all players in the same match or lobby. You just need to send the properties that you want to update. The player's data will be merged with the new data.

| Property  | Type                 | Description                                   |
|-----------|----------------------|-----------------------------------------------|
| `name`    | `string` `optional`  | The new name of the player.                   |
| `data`    | `object` `optional`  | The new additional data of the player.        |
| `isReady` | `boolean` `optional` | Whether the player is ready to start a match. |

Example:

```javascript
// Update the player's data
socket.emit('player-update', { isReady: true });
```

#### Event: `player-kick`

Kick a player from the current match. The player will be removed from the match and will be added to the lobby. The player will be notified that they were kicked. Only the owner of the match can kick players.

| Property | Type                | Description                                                |
|----------|---------------------|------------------------------------------------------------|
| `player` | `string` `required` | The unique identifier of the player that should be kicked. |

Example:

```javascript
// Kick a player from the current match
socket.emit('player-kick', { player: '1234' });
```

#### Event: `tick`

Sends a tick to the server. The server will proxy the tick to the owner of the match. The owner of the match will receive the tick and can respond with a tock. All validation and game logic should be handled on the client-side of the owner of the match.

**Important:** Ticks can only be sent by guests of the match.

| Property  | Type                | Description                                     |
|-----------|---------------------|-------------------------------------------------|
| `type`    | `string` `required` | The type of the tick. Default: `tick`           |
| `data`    | `object` `required` | Context data that should be sent with the tick. |

Example:

```javascript
// Send a tick to the server
socket.emit('tick', { type: 'move', data: { x: 10, y: 20 } });
```

#### Event: `tock`

Send a tock to the server. The server will either broadcast the tock to all players in the same match or to a specific player. The tock can be used to respond to a tick. It can also be used to sync data between clients. All validation and game logic should be handled on the client-side of the owner of the match.

**Important:** Tocks can only be sent by the owner of the match.

| Property  | Type                | Description                                                       |
|-----------|---------------------|-------------------------------------------------------------------|
| `type`    | `string` `required` | The type of the tock. Default: `tock`                             |
| `data`    | `object` `required` | Context data that should be sent with the tock.                   |
| `player`  | `string` `optional` | The unique identifier of the player that should receive the tock. |

Example:

```javascript
// Send a tock to the server
socket.emit('tock', { type: 'sync', data: { positions: [10, 20, 30] } });
```

### Server -> Client

Events that are sent from the server to the client.

#### Event: `init`

Sends the initial data to the client. The client can use this data to initialize the game state. The initial data includes the player & the list of matches.

| Property | Type     | Description                                           |
|----------|----------|-------------------------------------------------------|
| `player` | `Player` | The player that is currently connected to the server. |

Example:

```javascript
// Listen for the 'init' event
socket.on('init', (data) => {
  const { player } = data;

  // Initialize the game state
  // ...
});
```

#### Event: `alert`

Sends an alert to the client. Alerts are used to notify the client about important events. Alerts can be used to notify the client about maintenance, warnings, server errors or other important events.

| Property  | Type     | Description                                                |
|-----------|----------|------------------------------------------------------------|
| `type`    | `string` | The type of the alert. Types: `error`, `warning`, `status` |
| `message` | `string` | The message that should be displayed.                      |

Example:

```javascript
// Listen for the 'alert' event
socket.on('alert', (data) => {
  const { type, message } = data;

  // Display the alert to the player
  // ...
});
```

#### Event: `chat-message`

Sends a chat message to the client. Received chat messages will be displayed in the chat window of the client.

| Property  | Type     | Description                       |
|-----------|----------|-----------------------------------|
| `player`  | `Player` | The player that sent the message. |
| `message` | `string` | The message that was sent.        |

Example:

```javascript
// Listen for the 'chat-message' event
socket.on('chat-message', (data) => {
  const { player, message } = data;

  // Display the chat message in the chat window
  // ...
});
```

#### Event: `matches-updated`

Sends an updated list of matches to the client. The client can use this list to display available matches to the player. The list will be updated whenever a match is created, joined, left, started, finished or canceled.

| Property  | Type      | Description                                       |
|-----------|-----------|---------------------------------------------------|
| `matches` | `Match[]` | The list of matches that are currently available. |

Example:

```javascript
// Listen for the 'matches-updated' event
socket.on('matches-updated', (data) => {
  const { matches } = data;

  // Display the list of matches to the player
  for (const match of matches) {
    // ...
  }
});
```

#### Event: `match-started`

Sends a notification to the client that the match has started. The client can use this event to start the game loop and to start sending ticks to the server.

Example:

```javascript
// Listen for the 'match-started' event
socket.on('match-started', () => {
  // Start the game loop
  // ...
});
```

#### Event: `match-finished`

Sends a notification to the client that the match has finished. The client can use this event to stop the game loop and to stop sending ticks to the server. The client can also use this event to return to the lobby.

Example:

```javascript
// Listen for the 'match-finished' event
socket.on('match-finished', () => {
  // Stop the game loop
  // ...
});
```

#### Event: `match-canceled`

Sends a notification to the client that the match has been canceled. The client can use this event to leave the match and to return to the lobby.

Example:

```javascript
// Listen for the 'match-canceled' event
socket.on('match-canceled', () => {
  // Leave the match
  // ...
});
```

#### Event: `player-updated`

Sends an updated match object to the client. The client can use this event to update the match object in the game state.

See: [Match](#player)

Example:

```javascript
// Listen for the 'match-updated' event
socket.on('match-updated', (match) => {
  // Update the match object in the game state
  // ...
});
```

#### Event: `player-joined`

Sends a notification to the client that a player has joined the match. The client can use this event to update the list of players in the match.

See: [Player](#player)

Example:

```javascript
// Listen for the 'player-joined' event
socket.on('player-joined', (player) => {
  // Update the list of players in the match
  // ...
});
```

#### Event: `player-left`

Sends a notification to the client that a player has left the match. The client can use this event to update the list of players in the match.

See: [Player](#player)

Example:

```javascript
// Listen for the 'player-left' event
socket.on('player-left', (player) => {
  // Update the list of players in the match
  // ...
});
```

#### Event: `player-updated`

Sends an updated player object to the client. The client can use this event to update the player object in the game state.

See: [Player](#player)

Example:

```javascript
// Listen for the 'player-updated' event
socket.on('player-updated', (player) => {
  // Update the player object in the game state
  // ...
});
```

#### Event: `player-kicked`

Sends a notification to the client that a player has been kicked from the match. The client can use this event to update the list of players in the match.

See: [Player](#player)

Example:

```javascript
// Listen for the 'player-kicked' event
socket.on('player-kicked', (player) => {
  // Update the list of players in the match
  // ...
});
```

#### Event: `tick`

Sends a tick to the client. Only the owner of the match will receive the tick. The client can use this event to update the game state and to respond with a tock.

| Property  | Type     | Description                               |
|-----------|----------|-------------------------------------------|
| `type`    | `string` | The type of the tick.                     |
| `data`    | `object` | Context data that was sent with the tick. |

Example:

```javascript
// Listen for the 'tick' event
socket.on('tick', (data) => {
  const { type, data } = data;

  // Update the game state
  // ...
});
```

#### Event: `tock`

Sends a tock to the client. Only guests of the match will receive the tock. The client can use this event to sync the local game state.

| Property  | Type     | Description                               |
|-----------|----------|-------------------------------------------|
| `type`    | `string` | The type of the tock.                     |
| `data`    | `object` | Context data that was sent with the tock. |

Example:

```javascript
// Listen for the 'tock' event
socket.on('tock', (data) => {
  const { type, data } = data;

  // Sync the local game state
  // ...
});
```

## Models

### Player

| Property  | Type          | Description                                          |
|-----------|---------------|------------------------------------------------------|
| `id`      | `string`      | The unique identifier of the player.                 |
| `name`    | `string`      | The name of the player.                              |
| `data`    | `object` `*`  | An object that can be used to store additional data. |
| `isReady` | `boolean` `*` | Whether the player is ready to start a match.        |

`*`: Only available when in a / the same match. Not in lists.

### Match

| Property      | Type           | Description                                                                         |
|---------------|----------------|-------------------------------------------------------------------------------------|
| `id`          | `string`       | The unique identifier of the match.                                                 |
| `name`        | `string`       | The name of the match.                                                              |
| `isPrivate`   | `boolean`      | Whether the match is private. Private matches won't show up in the list of matches. |
| `isProtected` | `boolean`      | Whether the match is protected by a password.                                       |
| `numPlayers`  | `number`       | The number of players that are currently in the match.                              |
| `maxPlayers`  | `number`       | The maximum number of players that can be in the match.                             |
| `data`        | `object` `*`   | An object that can be used to store additional data.                                |
| `players`     | `Player[]` `*` | The players that are currently in the match.                                        |

`*`: Only available when in a / the same match. Not in lists.

### Status

| Property     | Type     | Description                                                        |
|--------------|----------|--------------------------------------------------------------------|
| `numPlayers` | `number` | The number of players that are currently connected to the server.  |
| `maxPlayers` | `number` | The maximum number of players that can be connected to the server. |
| `numMatches` | `number` | The number of matches that are currently active on the server.     |
| `maxMatches` | `number` | The maximum number of matches that can be active on the server.    |

## Support

If you have any questions or need help with the package, join the [Discord Server](https://discord.gg/Wyxsr9mh76) or [open an issue](https://github.com/aureola-codes/simple-multiplayer-server/issues) on GitHub.

## License

MIT License, Copyright (c) 2024 Christian Hanne
