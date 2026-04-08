// ============================================
// CONFIGURACIÓN DEL PROGRAMA
// ============================================

const PROGRAM_ID = new solanaWeb3.PublicKey("DUkaqnbqPNXR8uVScR3HsR6ngMVHbFgagZtohwMCHSxT");
const NETWORK = "https://api.devnet.solana.com";
const DEVELOPER_WALLET = new solanaWeb3.PublicKey("5u22TJBz2VofrGyUK2J5om7EdsCThejSaLxBZn4VrVtr");

let connection;
let wallet;
let program;
let currentGameId = null;
let snakeGame = null;
let isInGame = false;
let currentStake = 0;

// ============================================
// JUEGO SNAKE
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
            if (!this.isRunning) return;
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
        
        const isEating = head.x === this.food.x && head.y === this.food.y;
        
        if (isEating) {
            this.snake.unshift(head);
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            this.food = this.generateRandomFood();
        } else {
            this.snake.unshift(head);
            this.snake.pop();
        }
        
        if (this.checkCollision(head)) {
            this.gameOver();
            return false;
        }
        return true;
    }
    
    checkCollision(head) {
        if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
            return true;
        }
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
        
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(this.food.x * this.cellSize, this.food.y * this.cellSize, this.cellSize, this.cellSize);
        
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
        document.getElementById('gameStatus').textContent = '💀 ¡GAME OVER! Declarando ganador...';
        if (isInGame && currentGameId) {
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
    
    if (window.solana && window.solana.isPhantom) {
        wallet = window.solana;
        document.getElementById('walletButton').onclick = connectWallet;
        document.getElementById('gameStatus').textContent = '✅ Phantom detectado. Conecta tu wallet.';
    } else {
        document.getElementById('walletStatus').innerHTML = '<span>❌ Instala Phantom Wallet: https://phantom.app/</span>';
        document.getElementById('gameStatus').textContent = '❌ Phantom no detectado. Instálalo primero.';
    }
}

async function connectWallet() {
    try {
        const resp = await wallet.connect();
        const publicKey = resp.publicKey.toString();
        
        document.getElementById('walletAddress').innerHTML = `🔑 ${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`;
        document.getElementById('walletButton').textContent = '✅ Conectado';
        document.getElementById('walletButton').disabled = true;
        
        const balance = await connection.getBalance(new solanaWeb3.PublicKey(publicKey));
        document.getElementById('walletBalance').textContent = (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4) + ' SOL';
        
        const provider = new anchor.AnchorProvider(connection, wallet, {});
        program = new anchor.Program(IDL, PROGRAM_ID, provider);
        
        snakeGame = new SnakeGame('gameCanvas');
        snakeGame.draw();
        
        document.getElementById('gameStatus').textContent = '✅ Wallet conectada. Crea o únete a una sala.';
        
        await loadGames();
        
    } catch (err) {
        console.error(err);
        alert('Error al conectar: ' + err.message);
    }
}

// ============================================
// FUNCIONES DEL JUEGO
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
    currentStake = stakeLamports;
    
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
        
        currentGameId = gameId;
        document.getElementById('myGameContainer').style.display = 'block';
        document.getElementById('myGameInfo').innerHTML = `Sala #${gameId} | Apuesta: ${stake} SOL | Estado: Esperando oponente...`;
        
        await loadGames();
        
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
    
    currentStake = stake * solanaWeb3.LAMPORTS_PER_SOL;
    
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
        document.getElementById('myGameInfo').innerHTML = `Sala #${gameId} | Apuesta: ${stake} SOL | Estado: ¡Partida iniciada!`;
        document.getElementById('startGameBtn').style.display = 'block';
        
        await loadGames();
        
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
        
        document.getElementById('gameStatus').textContent = '📡 Declarando ganador y reclamando premio...';
        
        const winnerTx = await program.methods
            .declareWinner(new anchor.BN(currentGameId), wallet.publicKey)
            .accounts({
                game: gamePda,
                winnerAccount: wallet.publicKey,
            })
            .rpc();
        
        console.log("Ganador declarado!", winnerTx);
        
        const claimTx = await program.methods
            .claimPrize(new anchor.BN(currentGameId))
            .accounts({
                game: gamePda,
                claimer: wallet.publicKey,
                developer: DEVELOPER_WALLET,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        console.log("Premio reclamado!", claimTx);
        
        const newBalance = await connection.getBalance(wallet.publicKey);
        document.getElementById('walletBalance').textContent = (newBalance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4) + ' SOL';
        
        alert("🎉 ¡VICTORIA! Has ganado el 95% del pozo. Revisa tu balance.");
        
        isInGame = false;
        currentGameId = null;
        document.getElementById('myGameContainer').style.display = 'none';
        document.getElementById('startGameBtn').style.display = 'none';
        document.getElementById('gameStatus').textContent = '✅ Partida finalizada. Puedes crear o unirte a otra sala.';
        snakeGame.reset();
        await loadGames();
        
    } catch (err) {
        console.error(err);
        document.getElementById('gameStatus').textContent = '❌ Error al reclamar premio: ' + err.message;
        alert('Error al reclamar: ' + err.message);
    }
}

async function loadGames() {
    const roomsContainer = document.getElementById('roomsContainer');
    roomsContainer.innerHTML = '<div class="loading">🔄 Buscando salas activas...</div>';
    
    try {
        const games = [];
        for (let i = 1; i <= 10; i++) {
            try {
                const [pda] = await solanaWeb3.PublicKey.findProgramAddress(
                    [Buffer.from("game"), new anchor.BN(i).toArrayLike(Buffer, 'le', 8)],
                    program.programId
                );
                games.push({ id: i, pda });
            } catch(e) {}
        }
        
        if (games.length === 0) {
            roomsContainer.innerHTML = '<div class="loading">📭 No hay salas activas. ¡Crea una!</div>';
        } else {
            roomsContainer.innerHTML = games.map(game => `
                <div class="room-card">
                    <div>
                        <strong>🏠 Sala #${game.id}</strong><br>
                        Apuesta: 0.1 SOL
                    </div>
                    <button onclick="joinGame(${game.id}, 0.1)">⚔️ Unirse</button>
                </div>
            `).join('');
        }
    } catch(e) {
        roomsContainer.innerHTML = '<div class="loading">⚠️ No se pudieron cargar las salas</div>';
    }
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
});