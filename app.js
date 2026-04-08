// ============================================
// CONFIGURACIÓN DEL PROGRAMA
// ============================================

// TU PROGRAM ID (cópialo de Solana Playground)
const PROGRAM_ID = new solanaWeb3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// Red: Devnet para pruebas, mainnet-beta para producción
const NETWORK = "https://api.devnet.solana.com";

// Variables globales
let connection;
let wallet;
let program;
let currentGameId = null;
let snakeGame = null;
let isInGame = false;

// ============================================
// IDL DEL PROGRAMA (copia tu IDL aquí)
// ============================================
// ⚠️ IMPORTANTE: Reemplaza esto con el IDL que exportaste de Playground
const IDL = {
    "version": "0.1.0",
    "name": "arena_pvp",
    "instructions": [
        {
            "name": "createGame",
            "accounts": [
                { "name": "game", "isMut": true, "isSigner": false },
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

// ============================================
// JUEGO SNAKE (Canvas)
// ============================================

class SnakeGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.cellSize = this.canvas.width / this.gridSize;
        this.snake = [{x: 10, y: 10}];
        this.direction = 'RIGHT';
        this.food = this.generateRandomFood();
        this.score = 0;
        this.gameLoop = null;
        this.isRunning = false;
        
        this.setupControls();
    }
    
    generateRandomFood() {
        return {
            x: Math.floor(Math.random() * this.gridSize),
            y: Math.floor(Math.random() * this.gridSize)
        };
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.key;
            if (key === 'ArrowUp' && this.direction !== 'DOWN') this.direction = 'UP';
            else if (key === 'ArrowDown' && this.direction !== 'UP') this.direction = 'DOWN';
            else if (key === 'ArrowLeft' && this.direction !== 'RIGHT') this.direction = 'LEFT';
            else if (key === 'ArrowRight' && this.direction !== 'LEFT') this.direction = 'RIGHT';
        });
    }
    
    move() {
        const head = {...this.snake[0]};
        
        switch(this.direction) {
            case 'UP': head.y--; break;
            case 'DOWN': head.y++; break;
            case 'LEFT': head.x--; break;
            case 'RIGHT': head.x++; break;
        }
        
        // Comer comida
        if (head.x === this.food.x && head.y === this.food.y) {
            this.snake.unshift(head);
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            this.food = this.generateRandomFood();
        } else {
            this.snake.unshift(head);
            this.snake.pop();
        }
        
        // Verificar colisiones
        if (this.checkCollision(head)) {
            this.gameOver();
            return false;
        }
        
        return true;
    }
    
    checkCollision(head) {
        // Bordes
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
            return true;
        }
        // Cuerpo
        for (let i = 1; i < this.snake.length; i++) {
            if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
                return true;
            }
        }
        return false;
    }
    
    draw() {
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid
        this.ctx.strokeStyle = '#1a1a3a';
        for (let i = 0; i <= this.gridSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }
        
        // Comida
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(this.food.x * this.cellSize, this.food.y * this.cellSize, this.cellSize, this.cellSize);
        
        // Serpiente
        for (let i = 0; i < this.snake.length; i++) {
            const gradient = this.ctx.createLinearGradient(
                this.snake[i].x * this.cellSize,
                this.snake[i].y * this.cellSize,
                (this.snake[i].x + 1) * this.cellSize,
                (this.snake[i].y + 1) * this.cellSize
            );
            gradient.addColorStop(0, '#44ff44');
            gradient.addColorStop(1, '#44aa44');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(this.snake[i].x * this.cellSize, this.snake[i].y * this.cellSize, this.cellSize, this.cellSize);
        }
    }
    
    start() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        this.isRunning = true;
        this.gameLoop = setInterval(() => {
            if (this.move()) {
                this.draw();
            }
        }, 150);
    }
    
    stop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        this.isRunning = false;
    }
    
    gameOver() {
        this.stop();
        document.getElementById('gameStatus').textContent = '¡Game Over! ' + (isInGame ? 'Declarando ganador...' : '');
        if (isInGame) {
            declareWinnerAndClaim();
        }
    }
    
    reset() {
        this.stop();
        this.snake = [{x: 10, y: 10}];
        this.direction = 'RIGHT';
        this.food = this.generateRandomFood();
        this.score = 0;
        document.getElementById('score').textContent = '0';
        this.draw();
    }
}

// ============================================
// CONEXIÓN CON SOLANA
// ============================================

async function initSolana() {
    connection = new solanaWeb3.Connection(NETWORK);
    
    // Detectar Phantom
    if (window.solana && window.solana.isPhantom) {
        wallet = window.solana;
        document.getElementById('walletButton').onclick = connectWallet;
        document.getElementById('walletStatus').innerHTML += '<span>✅ Phantom detectado</span>';
    } else {
        document.getElementById('walletStatus').innerHTML = '<span>❌ Instala Phantom Wallet: https://phantom.app/</span>';
    }
}

async function connectWallet() {
    try {
        const resp = await wallet.connect();
        const publicKey = resp.publicKey.toString();
        
        document.getElementById('walletAddress').textContent = publicKey.slice(0, 8) + '...' + publicKey.slice(-8);
        document.getElementById('walletButton').textContent = 'Conectado ✅';
        document.getElementById('walletButton').disabled = true;
        
        // Obtener balance
        const balance = await connection.getBalance(new solanaWeb3.PublicKey(publicKey));
        document.getElementById('walletBalance').textContent = (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4) + ' SOL';
        
        // Inicializar programa Anchor
        const provider = new anchor.AnchorProvider(connection, wallet, {});
        program = new anchor.Program(IDL, PROGRAM_ID, provider);
        
        // Inicializar juego Snake
        snakeGame = new SnakeGame('gameCanvas');
        snakeGame.draw();
        
        document.getElementById('gameStatus').textContent = '✅ Wallet conectada. Puedes crear o unirte a salas.';
        
        // Cargar salas
        loadGames();
        
    } catch (err) {
        console.error(err);
        alert('Error al conectar: ' + err.message);
    }
}

// ============================================
// FUNCIONES DEL JUEGO PVP
// ============================================

async function createGame() {
    if (!wallet || !wallet.publicKey) {
        alert('Conecta tu wallet primero');
        return;
    }
    
    const stakeInput = document.getElementById('stakeAmount');
    const stake = parseFloat(stakeInput.value);
    const stakeLamports = stake * solanaWeb3.LAMPORTS_PER_SOL;
    
    if (stake < 0.1) {
        alert('La apuesta mínima es 0.1 SOL');
        return;
    }
    
    const gameId = Math.floor(Math.random() * 1000000);
    
    try {
        const [gamePda] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
            program.programId
        );
        
        const tx = await program.methods
            .createGame(new anchor.BN(gameId), new anchor.BN(stakeLamports))
            .accounts({
                game: gamePda,
                creator: wallet.publicKey,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        console.log("Sala creada! TX:", tx);
        alert(`✅ Sala ${gameId} creada! Apuesta: ${stake} SOL`);
        
        // Guardar sala actual
        currentGameId = gameId;
        document.getElementById('myGameContainer').style.display = 'block';
        document.getElementById('myGameInfo').innerHTML = `
            Sala #${gameId} | Apuesta: ${stake} SOL | Estado: Esperando oponente...
        `;
        
        loadGames();
        
    } catch (err) {
        console.error(err);
        alert('Error al crear sala: ' + err.message);
    }
}

async function joinGame(gameId, stake) {
    if (!wallet || !wallet.publicKey) {
        alert('Conecta tu wallet primero');
        return;
    }
    
    try {
        const [gamePda] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, 'le', 8)],
            program.programId
        );
        
        const tx = await program.methods
            .joinGame(new anchor.BN(gameId))
            .accounts({
                game: gamePda,
                joiner: wallet.publicKey,
            })
            .rpc();
        
        console.log("Te uniste! TX:", tx);
        alert(`✅ Te uniste a la sala ${gameId}!`);
        
        currentGameId = gameId;
        document.getElementById('myGameContainer').style.display = 'block';
        document.getElementById('myGameInfo').innerHTML = `
            Sala #${gameId} | Apuesta: ${stake} SOL | Estado: ¡Partida iniciada!
        `;
        document.getElementById('startGameBtn').style.display = 'block';
        
        loadGames();
        
    } catch (err) {
        console.error(err);
        alert('Error al unirse: ' + err.message);
    }
}

async function declareWinnerAndClaim() {
    if (!currentGameId || !wallet || !wallet.publicKey) return;
    
    try {
        const [gamePda] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("game"), new anchor.BN(currentGameId).toArrayLike(Buffer, 'le', 8)],
            program.programId
        );
        
        // Declarar ganador
        const winnerTx = await program.methods
            .declareWinner(new anchor.BN(currentGameId), wallet.publicKey)
            .accounts({
                game: gamePda,
                winnerAccount: wallet.publicKey,
            })
            .rpc();
        
        console.log("Ganador declarado!", winnerTx);
        
        // Reclamar premio
        const claimTx = await program.methods
            .claimPrize(new anchor.BN(currentGameId))
            .accounts({
                game: gamePda,
                claimer: wallet.publicKey,
                developer: new solanaWeb3.PublicKey("5u22TJBz2VofrGyUK2J5om7EdsCThejSaLxBZn4VrVtr"),
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        console.log("Premio reclamado!", claimTx);
        alert("🎉 ¡GANASTE! Premio reclamado. Revisa tu balance.");
        
        // Resetear juego
        isInGame = false;
        currentGameId = null;
        document.getElementById('myGameContainer').style.display = 'none';
        snakeGame.reset();
        loadGames();
        
    } catch (err) {
        console.error(err);
    }
}

async function loadGames() {
    // Simulación de carga de salas
    // En producción, leerías las PDAs de la blockchain
    const roomsContainer = document.getElementById('roomsContainer');
    roomsContainer.innerHTML = `
        <div class="room-card">
            <div>
                <strong>Sala #12345</strong><br>
                Creador: 8x2H...<br>
                Apuesta: 0.1 SOL
            </div>
            <button onclick="joinGame(12345, 0.1)">Unirse</button>
        </div>
        <div class="room-card">
            <div>
                <strong>Sala #67890</strong><br>
                Creador: GtZ9...<br>
                Apuesta: 0.2 SOL
            </div>
            <button onclick="joinGame(67890, 0.2)">Unirse</button>
        </div>
    `;
}

function startGame() {
    if (!currentGameId) return;
    isInGame = true;
    snakeGame.reset();
    snakeGame.start();
    document.getElementById('gameStatus').textContent = '🎮 ¡EN PARTIDA! Usa las flechas del teclado 🎮';
    document.getElementById('startGameBtn').style.display = 'none';
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSolana();
    
    document.getElementById('createGameBtn').onclick = createGame;
    document.getElementById('startGameBtn').onclick = startGame;
    document.getElementById('claimPrizeBtn').onclick = declareWinnerAndClaim;
});