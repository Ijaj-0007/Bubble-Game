// Global Variables
let score = 0;
let playerName = "Player";
let selectedTime = 60;     // Default game duration (in seconds)
let gameTimeRemaining = 0; // Set when the game starts

// Difficulty settings: game becomes harder over time
let difficulty = 0;                   // Increases over time (seconds)
const baseSpeed = 120;                // Base vertical speed (pixels per second)
const speedFactor = 2;                // Additional speed per second of difficulty
const baseMaxBubbles = 20;            // Base maximum active bubbles allowed
const bombProbability = 0.1;          // 10% chance for a bubble to be a bomb
let gameActive = true;

// Format time (in seconds) into "HH : MM : SS"
function formatTime(totalSeconds) {
  let hrs = Math.floor(totalSeconds / 3600);
  let mins = Math.floor((totalSeconds % 3600) / 60);
  let secs = totalSeconds % 60;
  return (hrs < 10 ? "0" + hrs : hrs) + " : " +
         (mins < 10 ? "0" + mins : mins) + " : " +
         (secs < 10 ? "0" + secs : secs);
}

// Update score display and store high score (for session reference)
function updateScore(value) {
  score += value;
  document.getElementById("score").textContent = score;
  localStorage.setItem("highScore", Math.max(score, localStorage.getItem("highScore") || 0));
}

// Play bubble pop sound (with pitch adjusted by bubble size)
function playBubbleSound(size) {
  const popSound = document.getElementById("popSound");
  popSound.playbackRate = 1 + (size / 100);
  popSound.play();
}

// Create sparkle effect at a given position
function createSparkles(x, y) {
  for (let i = 0; i < 5; i++) {
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle";
    sparkle.style.left = (x + Math.random() * 20 - 10) + "px";
    sparkle.style.top = (y + Math.random() * 20 - 10) + "px";
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 500);
  }
}

// List of fun emojis for bubbles
const emojiList = [
  "😀", "😂", "😎", "😍", "😜", "🤯",
  "🍎", "🍉", "🍊", "🍓",
  "💖", "💙", "💛", "💚"
];

let activeBubbles = [];

// Create a bubble with dynamic oscillation and collision repulsion
function createBubble() {
  const currentMaxBubbles = baseMaxBubbles + Math.floor(difficulty / 10);
  if (activeBubbles.length >= currentMaxBubbles) return;
  
  const bubbleElem = document.createElement("div");
  bubbleElem.classList.add("bubble");
  
  // Determine bubble size (range: 30-90px)
  const size = Math.random() * 60 + 30;
  bubbleElem.style.width = size + "px";
  bubbleElem.style.height = size + "px";
  
  // Set a random horizontal position
  const baseLeft = Math.random() * (window.innerWidth - size);
  bubbleElem.style.left = baseLeft + "px";
  bubbleElem.style.bottom = -size + "px";
  
  // Select a random emoji; with a probability, make it a bomb bubble
  let emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  let isBomb = false;
  if (Math.random() < bombProbability) {
    emoji = "💣";
    isBomb = true;
  }
  bubbleElem.innerHTML = emoji;
  
  // Store bubble properties for oscillation and collision
  bubbleElem._bubbleProps = {
    baseLeft: baseLeft,
    amplitude: Math.random() * 20 + 10,    // Horizontal sway amplitude
    frequency: Math.random() * 2 + 1,        // Sway frequency
    creationTime: performance.now(),
    verticalSpeed: baseSpeed,              // Will be updated dynamically
    xOffset: 0,
    size: size,
    isBomb: isBomb
  };
  
  // Use pointer events for responsiveness
  if (window.PointerEvent) {
    bubbleElem.addEventListener("pointerdown", handlePop);
  } else {
    bubbleElem.addEventListener("touchstart", handlePop, { passive: false });
  }
  
  document.body.appendChild(bubbleElem);
  activeBubbles.push(bubbleElem);
}

// Handle bubble pop events
function handlePop(event) {
  event.preventDefault();
  const bubble = event.currentTarget;
  if (bubble._popped) return;
  bubble._popped = true;
  
  const size = bubble._bubbleProps.size;
  playBubbleSound(size);
  bubble.classList.add("popped");
  
  // If a bomb bubble is clicked, end the game
  if (bubble._bubbleProps.isBomb) {
    setTimeout(() => { endGame(); }, 400);
    return;
  }
  
  updateScore(2);
  createSparkles(event.clientX, event.clientY);
  setTimeout(() => {
    if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
    activeBubbles = activeBubbles.filter(b => b !== bubble);
  }, 400);
}

// Recursive function to spawn bubbles.
// The spawn interval decreases as difficulty increases (minimum 200 ms).
function spawnBubble() {
  if (!gameActive) return;
  createBubble();
  let spawnInterval = Math.max(200, 500 - difficulty * 20);
  setTimeout(spawnBubble, spawnInterval);
}

let lastUpdate = performance.now();
function update() {
  const now = performance.now();
  const dt = (now - lastUpdate) / 1000;
  lastUpdate = now;
  
  // Increase difficulty over time and update global vertical speed
  difficulty += dt;
  const globalVerticalSpeed = baseSpeed + speedFactor * difficulty;
  
  // Update countdown timer
  gameTimeRemaining -= dt;
  if (gameTimeRemaining < 0) gameTimeRemaining = 0;
  document.getElementById("timeRemaining").textContent = formatTime(Math.floor(gameTimeRemaining));
  if (gameTimeRemaining <= 0) {
    endGame();
    return;
  }
  
  // Animate bubbles
  activeBubbles.forEach(bubble => {
    const props = bubble._bubbleProps;
    props.verticalSpeed = globalVerticalSpeed;
    let bottom = parseFloat(bubble.style.bottom);
    bottom += props.verticalSpeed * dt;
    bubble.style.bottom = bottom + "px";
    
    const elapsed = (now - props.creationTime) / 1000;
    let newLeft = props.baseLeft + Math.sin(elapsed * props.frequency) * props.amplitude + props.xOffset;
    newLeft = Math.max(0, Math.min(window.innerWidth - props.size, newLeft));
    bubble.style.left = newLeft + "px";
  });
  
  // Simple collision detection and repulsion between bubbles
  for (let i = 0; i < activeBubbles.length; i++) {
    const bubbleA = activeBubbles[i];
    const propsA = bubbleA._bubbleProps;
    const centerA = {
      x: parseFloat(bubbleA.style.left) + propsA.size / 2,
      y: parseFloat(bubbleA.style.bottom) + propsA.size / 2
    };
    for (let j = i + 1; j < activeBubbles.length; j++) {
      const bubbleB = activeBubbles[j];
      const propsB = bubbleB._bubbleProps;
      const centerB = {
        x: parseFloat(bubbleB.style.left) + propsB.size / 2,
        y: parseFloat(bubbleB.style.bottom) + propsB.size / 2
      };
      const dx = centerA.x - centerB.x;
      const dy = centerA.y - centerB.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = (propsA.size + propsB.size) / 2;
      if (distance < minDist && distance > 0) {
        const overlap = (minDist - distance) / 2;
        let direction = dx !== 0 ? dx / Math.abs(dx) : (Math.random() > 0.5 ? 1 : -1);
        propsA.xOffset += overlap * direction;
        propsB.xOffset -= overlap * direction;
      }
    }
  }
  
  // Gradually dampen repulsion offsets
  activeBubbles.forEach(bubble => {
    bubble._bubbleProps.xOffset *= 0.95;
  });
  
  // Remove bubbles that have floated off the top by deducting points
  for (let i = activeBubbles.length - 1; i >= 0; i--) {
    const bubble = activeBubbles[i];
    const props = bubble._bubbleProps;
    let bottom = parseFloat(bubble.style.bottom);
    if (bottom - props.size > window.innerHeight) {
      updateScore(-1);
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
      activeBubbles.splice(i, 1);
    }
  }
  
  requestAnimationFrame(update);
}

// Update persistent leaderboard in localStorage.
function updateLeaderboard(name, score) {
  let leaderboard = localStorage.getItem("leaderboard");
  let board = leaderboard ? JSON.parse(leaderboard) : [];
  let found = false;
  for (let i = 0; i < board.length; i++) {
    if (board[i].name.toLowerCase() === name.toLowerCase()) {
      if (score > board[i].score) {
        board[i].score = score;
      }
      found = true;
      break;
    }
  }
  if (!found) {
    board.push({ name: name, score: score });
  }
  localStorage.setItem("leaderboard", JSON.stringify(board));
}

// Show the leaderboard overlay.
function showLeaderboard() {
  let boardData = localStorage.getItem("leaderboard");
  boardData = boardData ? JSON.parse(boardData) : [];
  boardData.sort((a, b) => b.score - a.score);
  
  const lbOverlay = document.createElement("div");
  lbOverlay.id = "leaderboardOverlay";
  
  const lbContainer = document.createElement("div");
  lbContainer.className = "lb-container";
  
  const heading = document.createElement("h2");
  heading.textContent = "Leaderboard";
  lbContainer.appendChild(heading);
  
  boardData.forEach((entry, index) => {
    const entryDiv = document.createElement("div");
    if (index === 0) {
      entryDiv.textContent = `1st ${entry.name} 👑 - ${entry.score}`;
      entryDiv.style.fontSize = "2.5em";
      entryDiv.style.color = "gold";
    } else if (index === 1) {
      entryDiv.textContent = `2nd ${entry.name} 🥈 - ${entry.score}`;
      entryDiv.style.fontSize = "2em";
      entryDiv.style.color = "silver";
    } else if (index === 2) {
      entryDiv.textContent = `3rd ${entry.name} 🥉 - ${entry.score}`;
      entryDiv.style.fontSize = "1.5em";
      entryDiv.style.color = "#cd7f32";
    } else {
      entryDiv.textContent = `${index + 1}th ${entry.name} - ${entry.score}`;
      entryDiv.style.fontSize = "1.2em";
      entryDiv.style.color = "black";
    }
    entryDiv.style.margin = "10px 0";
    lbContainer.appendChild(entryDiv);
  });
  
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(lbOverlay);
  });
  lbContainer.appendChild(closeBtn);
  lbOverlay.appendChild(lbContainer);
  document.body.appendChild(lbOverlay);
}

// End the game: update leaderboard, stop spawns, clear bubbles, and show game over overlay.
function endGame() {
  gameActive = false;
  activeBubbles.forEach(bubble => bubble.remove());
  activeBubbles = [];
  
  updateLeaderboard(playerName, score);
  
  const overlay = document.createElement("div");
  overlay.id = "gameOverOverlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.8)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "200";
  
  const gameOverText = document.createElement("div");
  gameOverText.className = "game-over-text";
  gameOverText.textContent = "Game Over!";
  overlay.appendChild(gameOverText);
  
  setTimeout(() => {
    const restartButton = document.createElement("button");
    restartButton.className = "game-over-restart";
    restartButton.textContent = "Restart";
    restartButton.addEventListener("click", () => { location.reload(); });
    overlay.appendChild(restartButton);
    
    const leaderboardButton = document.createElement("button");
    leaderboardButton.className = "game-over-leaderboard";
    leaderboardButton.textContent = "Leaderboard ⬆";
    leaderboardButton.addEventListener("click", showLeaderboard);
    overlay.appendChild(leaderboardButton);
  }, 800);
  
  document.body.appendChild(overlay);
}

// Timer circle event listeners for changing game duration
const timerCircle = document.getElementById("timerCircle");
const timerDisplay = document.getElementById("timerDisplay");
timerDisplay.textContent = formatTime(selectedTime);

timerCircle.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    selectedTime += 60;
  } else {
    selectedTime = Math.max(10, selectedTime - 60);
  }
  timerDisplay.textContent = formatTime(selectedTime);
});

let lastTouchY = null;
timerCircle.addEventListener("touchstart", (e) => {
  lastTouchY = e.touches[0].clientY;
});
timerCircle.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (lastTouchY === null) return;
  let currentY = e.touches[0].clientY;
  let diff = currentY - lastTouchY;
  if (Math.abs(diff) >= 15) {
    if (diff > 0) {
      selectedTime += 60;
    } else {
      selectedTime = Math.max(10, selectedTime - 60);
    }
    timerDisplay.textContent = formatTime(selectedTime);
    lastTouchY = currentY;
  }
});
timerCircle.addEventListener("touchend", () => {
  lastTouchY = null;
});

// Start the game when the "Enter" button is clicked.
document.getElementById("startButton").addEventListener("click", () => {
  const nameInput = document.getElementById("playerNameInput").value.trim();
  if (nameInput !== "") playerName = nameInput;
  document.getElementById("scoreDiv").innerHTML =
    playerName + ": <span id='score'>" + score + "</span> | Time: <span id='timeRemaining'>" + formatTime(selectedTime) + "</span>";
  
  // Remove the start overlay from the DOM
  const overlayElem = document.getElementById("startOverlay");
  overlayElem.parentNode.removeChild(overlayElem);
  
  gameTimeRemaining = selectedTime;
  lastUpdate = performance.now();
  spawnBubble();
  requestAnimationFrame(update);
});