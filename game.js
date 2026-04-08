// ================= CONFIGURACIÓN =================
const NETWORK = "https://api.devnet.solana.com";
const PROGRAM_ID = new solanaWeb3.PublicKey("DUkqanbQpIXR8uVScR3HsiR6ngWlHbFgagZtohwMCHS");
const DEVELOPER_WALLET = new solanaWeb3.PublicKey("5u22TJBz2VofrGyUK2J5om7EdsCThejSaLxBZn4VrVtr");

// ================= VARIABLES =================
let connection;
let program;
let userPublicKey = null;
let currentGameId = null;

// ================= CONEXIÓN WALLET =================
async function connectWallet() {
    if (!window.solana || !window.solana.isPhantom) {
        alert("¡Instala Phantom Wallet!");
        return;
    }
    
    try {
        const resp = await window.solana.connect();
        userPublicKey = resp.publicKey;
        document.getElementById("walletAddress").innerText = userPublicKey.toString().slice(0, 8) + "...";
        
        connection = new solanaWeb3.Connection(NETWORK);
        
        const provider = new anchor.AnchorProvider(connection, window.solana, {});
        anchor.setProvider(provider);
        
        // Cargar IDL (necesitas tenerlo)
        const response = await fetch("idl.json");
        const idl = await response.json();
        
        program = new anchor.Program(idl, PROGRAM_ID, provider);
        
        await updateBalance();
        fetchGames();
        
    } catch (err) {
        console.error(err);
    }
}

async function updateBalance() {
    if (connection && userPublicKey) {
        const balance = await connection.getBalance(userPublicKey);
        document.getElementById("balance").innerHTML = `💰 ${(balance / 1e9).toFixed(2)} SOL`;
    }
}

// ================= CREAR SALA =================
async function createGame() {
    if (!program) {
        alert("Conecta tu wallet primero");
        return;
    }
    
    const stake = parseFloat(document.getElementById("stakeInput").value);
    const stakeLamports = stake * 1e9;
    const gameId = Math.floor(Math.random() * 1000000);
    
    try {
        const [gamePda] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
            PROGRAM_ID
        );
        
        const tx = await program.methods.createGame(new anchor.BN(gameId), new anchor.BN(stakeLamports))
            .accounts({
                game: gamePda,
                creator: userPublicKey,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        alert(`✅ Sala ${gameId} creada! Comparte el ID.`);
        fetchGames();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ================= UNIRSE A SALA =================
async function joinGame(gameId) {
    if (!program) return;
    
    try {
        const [gamePda] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("game"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
            PROGRAM_ID
        );
        
        const tx = await program.methods.joinGame(new anchor.BN(gameId))
            .accounts({
                game: gamePda,
                joiner: userPublicKey,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        alert(`✅ Te uniste a la sala ${gameId}!`);
        currentGameId = gameId;
        fetchGames();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ================= RECLAMAR PREMIO =================
async function claimPrize() {
    if (!currentGameId) {
        alert("No hay partida activa");
        return;
    }
    
    try {
        const [gamePda] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("game"), new anchor.BN(currentGameId).toArrayLike(Buffer, "le", 8)],
            PROGRAM_ID
        );
        
        const tx = await program.methods.claimPrize(new anchor.BN(currentGameId))
            .accounts({
                game: gamePda,
                claimer: userPublicKey,
                developer: DEVELOPER_WALLET,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        alert("💰 Premio reclamado!");
        currentGameId = null;
        await updateBalance();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ================= OBTENER SALAS =================
async function fetchGames() {
    if (!program) return;
    
    try {
        const games = await program.account.gameLobby.all();
        const roomsDiv = document.getElementById("roomsList");
        roomsDiv.innerHTML = "";
        
        let count = 0;
        for (let g of games) {
            const game = g.account;
            if (game.status.waiting && game.creator.toString() !== userPublicKey?.toString()) {
                count++;
                const div = document.createElement("div");
                div.className = "room-item";
                div.innerHTML = `
                    <span>Sala ${game.id} | ${(game.stake / 1e9).toFixed(2)} SOL</span>
                    <button onclick="joinGame(${game.id})">Unirse</button>
                `;
                roomsDiv.appendChild(div);
            }
        }
        
        if (count === 0) {
            roomsDiv.innerHTML = "<div>No hay salas disponibles. ¡Crea una!</div>";
        }
    } catch (err) {
        console.log("Error fetching games:", err);
    }
}

// ================= PREMIUM =================
async function purchasePremium() {
    if (!program) return;
    
    try {
        const [premiumPda] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("premium"), userPublicKey.toBuffer()],
            PROGRAM_ID
        );
        
        const tx = await program.methods.purchasePremium()
            .accounts({
                user: userPublicKey,
                developer: DEVELOPER_WALLET,
                premiumAccount: premiumPda,
                systemProgram: solanaWeb3.SystemProgram.programId,
            })
            .rpc();
        
        alert("⭐ Premium activado por 30 días!");
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ================= EVENTOS =================
document.getElementById("connectBtn").onclick = connectWallet;
document.getElementById("createGameBtn").onclick = createGame;
document.getElementById("claimBtn").onclick = claimPrize;
document.getElementById("premiumBtn").onclick = purchasePremium;
document.getElementById("leaveBtn").onclick = () => {
    currentGameId = null;
    alert("Saliste de la partida");
};

setInterval(fetchGames, 10000);
setInterval(updateBalance, 30000);
