// Game Constants
const CANVAS = document.getElementById('gameCanvas');
const CTX = CANVAS.getContext('2d');
const SCORE_DISPLAY = document.getElementById('scoreValue');
const HIGH_SCORE_DISPLAY = document.getElementById('highScoreValue');
const START_BTN = document.getElementById('startBtn');
const RESTART_BTN = document.getElementById('restartBtn');
const PLAY_AGAIN_BTN = document.getElementById('playAgainBtn');
const GAME_OVER_SCREEN = document.getElementById('gameOverScreen');
const FINAL_SCORE = document.getElementById('finalScore');
const FINAL_COMBO = document.getElementById('finalCombo');

// Game Settings
const GAME_WIDTH = CANVAS.width;
const GAME_HEIGHT = CANVAS.height;
const BLOCK_HEIGHT = 25;
const GRAVITY = 0.5;
const INITIAL_BLOCK_WIDTH = 80;

// Pastel Colors
const PASTEL_COLORS = [
    '#FFB6D9', // Pastel Pink
    '#D9B6FF', // Lavender
    '#B6D9FF', // Baby Blue
    '#FFCBA4', // Peach
    '#D4F4DD', // Mint
    '#FFE5B4'  // Cream
];

// Game State
let gameState = {
    isRunning: false,
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    combo: 0,
    maxCombo: 0,
    currentBlockWidth: INITIAL_BLOCK_WIDTH,
    blocks: [],
    currentBlock: null,
    gameSpeed: 1
};

// Block Class
class Block {
    constructor(x, y, width, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = BLOCK_HEIGHT;
        this.color = color;
        this.vx = 0; // Horizontal velocity
        this.vy = 0; // Vertical velocity
        this.direction = Math.random() > 0.5 ? 1 : -1; // Left or right
        this.speed = 2 + gameState.gameSpeed * 0.5;
    }

    update() {
        this.vy += GRAVITY;
        this.y += this.vy;
        this.x += this.direction * this.speed;

        // Bounce off walls
        if (this.x < 0 || this.x + this.width > GAME_WIDTH) {
            this.direction *= -1;
        }

        // Clamp position
        this.x = Math.max(0, Math.min(this.x, GAME_WIDTH - this.width));
    }

    draw() {
        // Draw main block
        CTX.fillStyle = this.color;
        CTX.shadowColor = 'rgba(255, 182, 193, 0.3)';
        CTX.shadowBlur = 10;
        CTX.shadowOffsetX = 0;
        CTX.shadowOffsetY = 5;
        CTX.fillRect(this.x, this.y, this.width, this.height);

        // Draw sparkly edge
        CTX.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        CTX.lineWidth = 2;
        CTX.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);

        CTX.shadowColor = 'transparent';
    }

    isColliding(otherBlock) {
        return this.y + this.height >= otherBlock.y &&
               this.y < otherBlock.y + otherBlock.height;
    }
}

// Floating Text Class
class FloatingText {
    constructor(x, y, text, color = '#FF1493') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 60; // frames
        this.maxLife = 60;
    }

    update() {
        this.life--;
        this.y -= 1;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        CTX.fillStyle = this.color;
        CTX.globalAlpha = alpha;
        CTX.font = 'bold 18px Arial';
        CTX.textAlign = 'center';
        CTX.shadowColor = 'rgba(0, 0, 0, 0.2)';
        CTX.shadowBlur = 3;
        CTX.fillText(this.text, this.x, this.y);
        CTX.globalAlpha = 1;
        CTX.shadowColor = 'transparent';
    }

    isAlive() {
        return this.life > 0;
    }
}

// Game Management
class Game {
    constructor() {
        this.floatingTexts = [];
        this.soundEnabled = true;
        this.initializeAudio();
    }

    initializeAudio() {
        // Create audio context for sound effects
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    playSound(type) {
        if (!this.soundEnabled) return;

        try {
            const now = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            switch(type) {
                case 'land':
                    oscillator.frequency.value = 400;
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    oscillator.start(now);
                    oscillator.stop(now + 0.1);
                    break;
                case 'perfect':
                    oscillator.frequency.value = 600;
                    gainNode.gain.setValueAtTime(0.15, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    oscillator.start(now);
                    oscillator.stop(now + 0.2);
                    break;
                case 'gameover':
                    oscillator.frequency.value = 200;
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    oscillator.start(now);
                    oscillator.stop(now + 0.5);
                    break;
            }
        } catch (e) {
            console.log('Audio not available');
        }
    }

    spawnBlock() {
        const randomColor = PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
        const x = GAME_WIDTH / 2 - gameState.currentBlockWidth / 2;
        gameState.currentBlock = new Block(x, 0, gameState.currentBlockWidth, randomColor);
    }

    handleBlockLanding() {
        if (!gameState.currentBlock || gameState.blocks.length === 0) {
            return;
        }

        const lastBlock = gameState.blocks[gameState.blocks.length - 1];
        const currentBlock = gameState.currentBlock;

        // Check if block is on top of last block
        if (currentBlock.isColliding(lastBlock)) {
            // Calculate alignment
            const leftDiff = Math.abs(currentBlock.x - lastBlock.x);
            const rightDiff = Math.abs((currentBlock.x + currentBlock.width) - (lastBlock.x + lastBlock.width));

            // Calculate how much of the block is properly placed
            const overlap = Math.min(currentBlock.x + currentBlock.width, lastBlock.x + lastBlock.width) -
                           Math.max(currentBlock.x, lastBlock.x);

            if (overlap > 0) {
                // Block landed successfully
                currentBlock.y = lastBlock.y - currentBlock.height;
                currentBlock.vy = 0;
                currentBlock.vx = 0;

                // Check if it's a perfect drop
                const tolerance = 5;
                if (leftDiff < tolerance && rightDiff < tolerance) {
                    // Perfect drop!
                    gameState.score += 3;
                    gameState.combo += 1;
                    this.playSound('perfect');
                    this.addFloatingText(currentBlock.x + currentBlock.width / 2, currentBlock.y, '💖 Perfect!', '#FF1493');

                    if (gameState.combo >= 3) {
                        this.addFloatingText(currentBlock.x + currentBlock.width / 2, currentBlock.y - 30, '✨ Cute Combo!', '#FFB6D9');
                    }
                } else {
                    // Regular drop
                    gameState.score += 1;
                    gameState.combo = 0;
                    this.playSound('land');
                    this.addFloatingText(currentBlock.x + currentBlock.width / 2, currentBlock.y, '+1', '#FF69B4');
                }

                // Update max combo
                if (gameState.combo > gameState.maxCombo) {
                    gameState.maxCombo = gameState.combo;
                }

                // Shrink block for next turn
                gameState.currentBlockWidth = Math.max(20, gameState.currentBlockWidth - (overlap * 0.5));
                gameState.blocks.push(currentBlock);
                gameState.gameSpeed += 0.1;

                // Update high score
                if (gameState.score > gameState.highScore) {
                    gameState.highScore = gameState.score;
                    localStorage.setItem('highScore', gameState.highScore);
                }

                // Spawn new block
                this.spawnBlock();
                this.updateScore();
            } else {
                // Block missed completely
                this.endGame();
            }
        } else if (currentBlock.y > GAME_HEIGHT) {
            // Block fell off screen
            this.endGame();
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }

    updateScore() {
        SCORE_DISPLAY.textContent = gameState.score;
        HIGH_SCORE_DISPLAY.textContent = gameState.highScore;
    }

    endGame() {
        gameState.isRunning = false;
        this.playSound('gameover');
        FINAL_SCORE.textContent = `Score: ${gameState.score}`;
        FINAL_COMBO.textContent = `Best Combo: ${gameState.maxCombo}`;
        GAME_OVER_SCREEN.style.display = 'flex';
        START_BTN.style.display = 'block';
        RESTART_BTN.style.display = 'none';
    }

    resetGame() {
        gameState = {
            isRunning: true,
            score: 0,
            highScore: gameState.highScore,
            combo: 0,
            maxCombo: 0,
            currentBlockWidth: INITIAL_BLOCK_WIDTH,
            blocks: [],
            currentBlock: null,
            gameSpeed: 1
        };
        this.floatingTexts = [];
        GAME_OVER_SCREEN.style.display = 'none';
        START_BTN.style.display = 'none';
        RESTART_BTN.style.display = 'block';
        this.spawnBlock();
        this.updateScore();
    }

    update() {
        if (!gameState.isRunning) return;

        // Update current block
        if (gameState.currentBlock) {
            gameState.currentBlock.update();
            this.handleBlockLanding();
        }

        // Update floating texts
        this.floatingTexts = this.floatingTexts.filter(text => {
            text.update();
            return text.isAlive();
        });
    }

    draw() {
        // Clear canvas with gradient
        const gradient = CTX.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        gradient.addColorStop(0, '#fff9e6');
        gradient.addColorStop(1, '#ffe6f0');
        CTX.fillStyle = gradient;
        CTX.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Draw floating clouds/sparkles
        this.drawBackgroundElements();

        // Draw blocks
        for (const block of gameState.blocks) {
            block.draw();
        }

        // Draw current block
        if (gameState.currentBlock) {
            gameState.currentBlock.draw();
        }

        // Draw floating texts
        for (const text of this.floatingTexts) {
            text.draw();
        }

        // Draw game over text if game is not running
        if (!gameState.isRunning && gameState.blocks.length > 0) {
            CTX.fillStyle = 'rgba(0, 0, 0, 0.3)';
            CTX.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
    }

    drawBackgroundElements() {
        // Draw sparkles
        CTX.fillStyle = 'rgba(255, 182, 193, 0.2)';
        for (let i = 0; i < 5; i++) {
            const x = (GAME_WIDTH / 5) * i + Math.sin(Date.now() / 1000 + i) * 5;
            const y = 50 + i * 30;
            this.drawStar(x, y, 3);
        }

        // Draw floating hearts
        CTX.fillStyle = 'rgba(255, 105, 180, 0.15)';
        CTX.font = '20px Arial';
        CTX.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
            const x = (GAME_WIDTH / 3) * i + 50 + Math.cos(Date.now() / 2000 + i) * 10;
            const y = 80 + Math.sin(Date.now() / 2000 + i) * 10;
            CTX.fillText('💕', x, y);
        }
    }

    drawStar(x, y, size) {
        CTX.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = x + Math.cos(angle) * size;
            const py = y + Math.sin(angle) * size;
            if (i === 0) CTX.moveTo(px, py);
            else CTX.lineTo(px, py);
        }
        CTX.closePath();
        CTX.fill();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize Game
const game = new Game();
HIGH_SCORE_DISPLAY.textContent = gameState.highScore;

// Event Listeners
START_BTN.addEventListener('click', () => {
    game.resetGame();
});

RESTART_BTN.addEventListener('click', () => {
    game.resetGame();
});

PLAY_AGAIN_BTN.addEventListener('click', () => {
    game.resetGame();
});

CANVAS.addEventListener('click', (e) => {
    if (!gameState.isRunning) return;

    const rect = CANVAS.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    // Simple tap mechanic - you can enhance this
    // This is just to demonstrate click handling
});

// Keyboard support for testing
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && gameState.isRunning) {
        e.preventDefault();
        // Space to start/interact
    }
});

// Start game loop
game.gameLoop();
