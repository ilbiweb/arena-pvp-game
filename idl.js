// IDL del programa Arena PvP
const IDL = {
  "version": "0.1.0",
  "name": "arena_pvp",
  "instructions": [
    {
      "name": "createGame",
      "accounts": [
        { "name": "game", "isMut": true, "isSigner": true },
        { "name": "creator", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "gameId", "type": "u64" },
        { "name": "stake", "type": "u64" }
      ]
    },
    {
      "name": "joinGame",
      "accounts": [
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "joiner", "isMut": true, "isSigner": true }
      ],
      "args": [
        { "name": "gameId", "type": "u64" }
      ]
    },
    {
      "name": "declareWinner",
      "accounts": [
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "winnerAccount", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "gameId", "type": "u64" },
        { "name": "winner", "type": "publicKey" }
      ]
    },
    {
      "name": "claimPrize",
      "accounts": [
        { "name": "game", "isMut": true, "isSigner": false },
        { "name": "claimer", "isMut": true, "isSigner": true },
        { "name": "developer", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "gameId", "type": "u64" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "GameLobby",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "id", "type": "u64" },
          { "name": "creator", "type": "publicKey" },
          { "name": "opponent", "type": "publicKey" },
          { "name": "stake", "type": "u64" },
          { "name": "status", "type": { "defined": "GameStatus" } },
          { "name": "winner", "type": "publicKey" }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "GameStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "Waiting" },
          { "name": "Active" },
          { "name": "Finished" }
        ]
      }
    }
  ]
};