const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Speed settings
const SPEED_SETTINGS = {
    slow: {
        initial: 150,
        minimum: 100,
        decrease: 1
    },
    normal: {
        initial: 100,
        minimum: 50,
        decrease: 2
    },
    fast: {
        initial: 70,
        minimum: 30,
        decrease: 3
    }
};

// Game state
let snake = [{ x: 10, y: 10 }];
let food = { x: 5, y: 5 };
let bonusFood = null;
let bonusFoodTimer = null;
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameSpeed = SPEED_SETTINGS.normal.initial;
let currentSpeedSetting = 'normal';
let gameLoop;
let gameRunning = true;
let isPaused = false;
let powerUpActive = false;
let powerUpTimeout;

// Update high score display
document.getElementById('highScore').textContent = highScore;

// Speed control function
function setGameSpeed(speed) {
    if (!gameRunning || isPaused) return;
    
    // Remove active class from all buttons
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    // Add active class to selected button
    document.getElementById(`${speed}Btn`).classList.add('active');
    
    currentSpeedSetting = speed;
    const newSpeed = SPEED_SETTINGS[speed].initial;
    
    // Only update if the speed has changed
    if (gameSpeed !== newSpeed) {
        gameSpeed = newSpeed;
        clearInterval(gameLoop);
        gameLoop = setInterval(drawGame, gameSpeed);
    }
}

// Game controls
document.addEventListener('keydown', (event) => {
    // Prevent default scrolling for arrow keys and space
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
    }

    const key = event.key;
    
    // Movement controls
    if (!isPaused) {
        if (key === 'ArrowUp' && dy === 0) {
            dx = 0;
            dy = -1;
        } else if (key === 'ArrowDown' && dy === 0) {
            dx = 0;
            dy = 1;
        } else if (key === 'ArrowLeft' && dx === 0) {
            dx = -1;
            dy = 0;
        } else if (key === 'ArrowRight' && dx === 0) {
            dx = 1;
            dy = 0;
        }
    }

    // Pause game
    if (key === ' ') {
        togglePause();
    }

    // Activate power-up
    if (key === 'p' || key === 'P') {
        activatePowerUp();
    }
});

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameLoop);
        drawPauseScreen();
    } else {
        gameLoop = setInterval(drawGame, gameSpeed);
    }
}

function activatePowerUp() {
    if (!powerUpActive && score >= 50) {
        powerUpActive = true;
        score -= 50;
        document.getElementById('score').textContent = score;
        document.getElementById('powerUp').style.display = 'block';
        
        // Temporarily increase speed based on current speed setting
        const originalSpeed = gameSpeed;
        const speedReduction = SPEED_SETTINGS[currentSpeedSetting].decrease * 15;
        gameSpeed = Math.max(SPEED_SETTINGS[currentSpeedSetting].minimum, gameSpeed - speedReduction);
        clearInterval(gameLoop);
        gameLoop = setInterval(drawGame, gameSpeed);

        // Reset after 5 seconds
        clearTimeout(powerUpTimeout);
        powerUpTimeout = setTimeout(() => {
            powerUpActive = false;
            gameSpeed = originalSpeed;
            clearInterval(gameLoop);
            gameLoop = setInterval(drawGame, gameSpeed);
            document.getElementById('powerUp').style.display = 'none';
        }, 5000);
    }
}

function drawGame() {
    if (!gameRunning || isPaused) return;

    // Move snake with wrap-around
    let head = { 
        x: snake[0].x + dx, 
        y: snake[0].y + dy 
    };

    // Wrap around logic
    if (head.x < 0) {
        head.x = tileCount - 1;
    } else if (head.x >= tileCount) {
        head.x = 0;
    }
    
    if (head.y < 0) {
        head.y = tileCount - 1;
    } else if (head.y >= tileCount) {
        head.y = 0;
    }

    snake.unshift(head);

    // Check if snake ate regular food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('score').textContent = score;
        updateHighScore();
        generateFood();
        generateBonusFood(); // Chance to spawn bonus food when regular food is eaten
        updateGameSpeed();
    } 
    // Check if snake ate bonus food
    else if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
        score += 25;
        document.getElementById('score').textContent = score;
        updateHighScore();
        bonusFood = null;
        clearTimeout(bonusFoodTimer);
        updateGameSpeed();
    } else {
        snake.pop();
    }

    // Check collision with self only
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid with portal effect at edges
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    for (let i = 0; i < tileCount; i++) {
        // Highlight edges with portal effect
        if (i === 0 || i === tileCount - 1) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + Math.sin(Date.now() / 500) * 0.2})`;
        } else {
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        }
        
        // Draw vertical lines (stop before the last pixel)
        if (i < tileCount - 1) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height - 1);
            ctx.stroke();
        }
        
        // Draw horizontal lines (stop before the last pixel)
        if (i < tileCount - 1) {
            ctx.beginPath();
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width - 1, i * gridSize);
            ctx.stroke();
        }
    }

    // Draw snake with portal effect when near edges
    snake.forEach((segment, index) => {
        const gradient = ctx.createRadialGradient(
            segment.x * gridSize + gridSize/2,
            segment.y * gridSize + gridSize/2,
            0,
            segment.x * gridSize + gridSize/2,
            segment.y * gridSize + gridSize/2,
            gridSize/2
        );

        // Add portal effect when near edges
        if (segment.x === 0 || segment.x === tileCount - 1 || 
            segment.y === 0 || segment.y === tileCount - 1) {
            if (index === 0) {
                gradient.addColorStop(0, powerUpActive ? '#fff' : '#7f7');
                gradient.addColorStop(1, powerUpActive ? '#aa0' : '#383');
            } else {
                gradient.addColorStop(0, powerUpActive ? '#ff4' : '#5f5');
                gradient.addColorStop(1, powerUpActive ? '#880' : '#282');
            }
        } else {
            if (index === 0) {
                gradient.addColorStop(0, powerUpActive ? '#ff0' : '#5f5');
                gradient.addColorStop(1, powerUpActive ? '#aa0' : '#383');
            } else {
                gradient.addColorStop(0, powerUpActive ? '#ff4' : '#3f3');
                gradient.addColorStop(1, powerUpActive ? '#880' : '#282');
            }
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });

    // Draw regular food
    drawFood();

    // Draw bonus food if it exists
    if (bonusFood) {
        const pulseSize = Math.sin(Date.now() / 100) * 3; // Bigger pulse
        ctx.fillStyle = '#ffdd00'; // Golden yellow color
        ctx.beginPath();
        const bonusCenterX = bonusFood.x * gridSize + gridSize / 2;
        const bonusCenterY = bonusFood.y * gridSize + gridSize / 2;
        ctx.arc(bonusCenterX, bonusCenterY, (gridSize / 2) + pulseSize, 0, Math.PI * 2);
        ctx.fill();

        // Add special glow effect to bonus food
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Add star shape
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5;
            const x = bonusCenterX + Math.cos(angle) * (gridSize / 3);
            const y = bonusCenterY + Math.sin(angle) * (gridSize / 3);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }
}

function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
}

function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    food = newFood;
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = score;
    clearInterval(gameLoop);
}

function restartGame() {
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    score = 0;
    gameSpeed = SPEED_SETTINGS[currentSpeedSetting].initial;
    gameRunning = true;
    isPaused = false;
    powerUpActive = false;
    bonusFood = null;
    clearTimeout(bonusFoodTimer);
    document.getElementById('score').textContent = '0';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('powerUp').style.display = 'none';
    generateFood();
    clearInterval(gameLoop);
    gameLoop = setInterval(drawGame, gameSpeed);
}

// Function to generate bonus food
function generateBonusFood() {
    if (bonusFood === null && Math.random() < 0.2) { // 20% chance to spawn bonus food
        let newBonusFood;
        do {
            newBonusFood = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
        } while (
            snake.some(segment => segment.x === newBonusFood.x && segment.y === newBonusFood.y) ||
            (food.x === newBonusFood.x && food.y === newBonusFood.y)
        );
        
        bonusFood = newBonusFood;
        
        // Make bonus food disappear after 5 seconds
        clearTimeout(bonusFoodTimer);
        bonusFoodTimer = setTimeout(() => {
            bonusFood = null;
        }, 5000);
    }
}

// Helper function to update high score
function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }
}

// Helper function to update game speed
function updateGameSpeed() {
    if (gameSpeed > SPEED_SETTINGS[currentSpeedSetting].minimum && !powerUpActive) {
        gameSpeed -= SPEED_SETTINGS[currentSpeedSetting].decrease;
        clearInterval(gameLoop);
        gameLoop = setInterval(drawGame, gameSpeed);
    }
}

// Helper function to draw regular food
function drawFood() {
    const pulseSize = Math.sin(Date.now() / 100) * 2;
    ctx.fillStyle = '#f55';
    ctx.beginPath();
    const centerX = food.x * gridSize + gridSize / 2;
    const centerY = food.y * gridSize + gridSize / 2;
    ctx.arc(centerX, centerY, (gridSize / 2 - 2) + pulseSize, 0, Math.PI * 2);
    ctx.fill();

    // Add glow effect to food
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f00';
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Start the game
generateFood();
gameLoop = setInterval(drawGame, gameSpeed); 