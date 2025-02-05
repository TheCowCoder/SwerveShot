const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


const CONSTANTS = window.CONSTANTS;

// Set canvas size to match the screen

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // renderWorld();
}
window.addEventListener("resize", resize);
resize();


// Lock and hide the cursor on click
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

let exittingPointerLock = false;
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        console.log('Pointer lock enabled on canvas');
    } else {
        console.log('Pointer lock exited');
        exittingPointerLock = true;
        mousePos = null;
        socket.emit("exit pointer lock", () => {
            exittingPointerLock = false;
        });
    }
});

let objects = {};
let wallVertices;

class Vec2Class {
    constructor(x = 0, y = 0) {
        // Check if x is an instance of Vec2Class
        if (isNaN(x)) {
            // If it is, copy its x and y values
            this.x = x.x;
            this.y = x.y;
        } else {
            // Otherwise, assign the provided x and y values
            this.x = x;
            this.y = y;
        }
    }

    // Add another vector to this vector
    add(vec) {
        return Vec2(this.x + vec.x, this.y + vec.y);
    }

    // Subtract another vector from this vector
    sub(vec) {
        return Vec2(this.x - vec.x, this.y - vec.y);
    }

    // Scale the vector by a scalar value
    mul(scalar) {
        return Vec2(this.x * scalar, this.y * scalar);
    }

    // Calculate the magnitude of the vector
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // Normalize the vector (make it unit length)
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) {
            return Vec2(0, 0); // Prevent division by zero
        }
        return Vec2(this.x / mag, this.y / mag);
    }

    clone() {
        return Vec2(this.x, this.y);
    }
}

const Vec2 = ((vec2Class) => {
    return function (x = 0, y = 0) {
        return new vec2Class(x, y);
    };
})(Vec2Class);



function degToRad(deg) {
    return deg * (Math.PI / 180);
}


function gameLoop() {
    handleInputs();
    world.step(TIME_STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);

    renderWorld();

    requestAnimationFrame(gameLoop);

}



// #region Socket events

let socket = io({ reconnection: false });
let ourId;
let mousePos;
let settings;

socket.on("chat", (sender, msg) => {
    chatLog.value += `${sender}: ${msg}\n`;
});
socket.on("match made", () => {
    inGame();
});

socket.on("settings", _settings => {
    settings = _settings;
});

socket.on("your id", id => {
    ourId = id;
})
socket.on("mouse pos", pos => {
    if (!exittingPointerLock) mousePos = Vec2(pos);
});


socket.on("objects added", (_objects) => {
    for (let id in _objects) {
        let object = _objects[id];
        objects[id] = object;
    }
});

socket.on("object updates", (objectUpdates, timestamp, interpolate = true) => {
    let interpolationObjectUpdates = {};
    for (let id in objectUpdates) {
        const values = objectUpdates[id];

        for (let [key, value] of Object.entries(values)) {
            if (value.x != undefined && value.y != undefined) {
                value = Vec2(value);
            }

            if (key == "position" || key == "angle") {

                if (!interpolationObjectUpdates[id]) {
                    interpolationObjectUpdates[id] = {};
                }
                interpolationObjectUpdates[id][key] = value;
            } else {
                objects[id][key] = value;
            }

        }
    }
    if (Object.keys(interpolationObjectUpdates).length) {
        renderer.receiveServerState(interpolationObjectUpdates, timestamp, interpolate);
    }
});

socket.on("objects removed", (ids) => {
    if (!objects) return;
    for (let id of ids) {
        delete objects[id];
    }
});


function copyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    console.log("Copied to clipboard: " + text);
}


socket.on("wall vertices", (_wallVertices) => {
    wallVertices = [];
    for (let v of _wallVertices) {
        wallVertices.push(new Vec2(v));
    }
});

const countdownElement = document.getElementById("countdown");
const timerEl = document.getElementById("timer");


socket.on("game start", () => {
    document.getElementById("leftScore").innerText = "0";
    document.getElementById("rightScore").innerText = "0";

})
socket.on("countdown", (countdown) => {
    console.log("CD");
    countdownElement.style.display = null;
    countdownElement.textContent = countdown;

    if (countdown === 0) {
        countdownElement.textContent = "Go!";

        setTimeout(() => {
            countdownElement.style.display = "none";
        }, 1000);

    }
});

socket.on("game timer", remainingSeconds => {
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    timerEl.textContent = formatTime(remainingSeconds);

})

socket.on("goal", team => {
    if (team === "left") {
        let rightScoreElement = document.getElementById("rightScore");
        let currentScore = parseInt(rightScoreElement.innerText);
        rightScoreElement.innerText = currentScore + 1;
    } else if (team === "right") {
        let leftScoreElement = document.getElementById("leftScore");
        let currentScore = parseInt(leftScoreElement.innerText);
        leftScoreElement.innerText = currentScore + 1;
    }
});



// #endregion


// #region Document events
document.getElementById("game").style.display = "none";

document.addEventListener('keydown', (e) => {
    if (!e.repeat) socket.emit("keydown", e.key);
    if (e.key === "Escape") {
        customScale = false;
    }
});

document.addEventListener('keyup', (e) => {
    if (!e.repeat) socket.emit("keyup", e.key);
});

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas && !exittingPointerLock) {
        socket.emit("mousemove", event.movementX, event.movementY);
    }

    // socket.emit("mousemove", event.clientX, event.clientY, canvas.width, canvas.height);

});

document.addEventListener("mousedown", e => {
    socket.emit("mousedown", e.button);
});
document.addEventListener("mouseup", e => {
    socket.emit("mouseup", e.button);
});


document.addEventListener("wheel", (e) => {
    if (!wallVertices) return;
    customScale = true;
    scaleBtn.style.display = null;

    // Adjust multiplier based on the scroll direction and distance
    scaleResize += e.deltaY * 0.00025;  // Multiply by a small value to control the effect
    console.log(scaleResize);  // Output the new multiplier to check the result

    // Prevent the default scroll behavior (optional)
    e.preventDefault();
});

let settingsBtn = document.getElementById("settingsBtn");
let overlay = document.getElementById("overlay");
let closeBtn = document.getElementById("closeBtn");

settingsBtn.addEventListener("click", () => {
    console.log("visuble");
    overlay.style.display = "flex"; // Show overlay
});

closeBtn.addEventListener("click", () => {
    overlay.style.display = "none"; // Hide overlay
});

document.getElementById("saveBtn").addEventListener("click", () => {
    let team = document.getElementById("team").value;
    socket.emit("team", team);

    let mouseSensitivity = document.getElementById("mouseSensitivity").value;
    let mouseRange = document.getElementById("mouseRange").value;
    socket.emit("settings", {
        mouseSensitivity,
        mouseRange
    }, (result) => {
        if (result) {
            overlay.style.display = "none";

        } else {
            alert("Join a game before setting settings!");
        }
    });
});

document.getElementById("startGame").addEventListener("click", () => {
    socket.emit("start");
    overlay.style.display = "none";
});
document.getElementById("endGame").addEventListener("click", () => {
    socket.emit("end");
    overlay.style.display = "none";
})

document.getElementById("leaveGame").addEventListener("click", () => {
    overlay.style.display = "none";
    socket.emit("leave game");

    document.getElementById("menu").style.display = null;
    document.getElementById("game").style.display = "none";
    objects = {};
    wallVertices = null;
});

const chatInput = document.getElementById("chatInput")
const chatLog = document.getElementById("chatLog");

chatLog.value += "Type /settings for settings\n";

chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const msg = chatInput.value;

        if (msg.startsWith("/")) {
            const cmd = msg.slice(1).split(" ")[0];
            const args = msg.slice(1).split(" ").slice(1); // Extract the arguments
        } else {
            socket.emit("chat", msg);
        }

        chatLog.scrollTop = chatLog.scrollHeight;
        chatInput.value = "";
    }
});

let scaleBtn = document.getElementById("scaleBtn");
scaleBtn.style.display = "none";

scaleBtn.addEventListener("click", () => {
    customScale = false;
    scaleBtn.style.display = "none";
});

let privateBtn = document.getElementById("privateBtn");
let oneVOneBtn = document.getElementById("oneVOneBtn");
let twoVTwoBtn = document.getElementById("twoVTwoBtn");
let buttonContainer = document.getElementById("buttons");

privateBtn.addEventListener("click", () => {
    // Store original buttons
    let originalButtons = buttonContainer.innerHTML;

    // Replace buttons with "Create Room" and "Join Room"
    buttonContainer.innerHTML = `
        <div>
            <button class="menu-btn" id="createRoomBtn">Create Room</button>
            <button class="menu-btn" id="joinRoomBtn">Join Room</button>
        </div>
    `;


    // Add event listeners to new buttons
    document.getElementById("createRoomBtn").addEventListener("click", () => {
        socket.emit("create game", (code) => {
            chatLog.value += "The game code is " + code + "\n";
            chatLog.value += "The game code is copied to clipboard!\n";
            copyToClipboard(code);

            inGame();
        });

        restoreButtons(originalButtons);

        inGame();
    });

    document.getElementById("joinRoomBtn").addEventListener("click", () => {
        let gameCode = prompt("Game code?");

        socket.emit("join game", gameCode, (code) => {
            if (code !== false) {
                chatLog.value += "The game code is " + code + "\n";
                chatLog.value += "The game code is copied to clipboard!";
                copyToClipboard(code);
                inGame();
            } else {
                alert("Couldn't find game!");
            }
        });

        restoreButtons(originalButtons);

    });
});


let searching = document.getElementById("searching");

searching.style.display = "none";

oneVOneBtn.addEventListener("click", (e) => {
    socket.emit("queue", "1v1");
    buttonContainer.style.display = "none";
    searching.style.display = null;
});

twoVTwoBtn.addEventListener("click", (e) => {
    socket.emit("queue", "2v2");
    buttonContainer.style.display = "none";
    searching.style.display = null;
});


threeVThreeBtn.addEventListener("click", (e) => {
    socket.emit("queue", "3v3");
    buttonContainer.style.display = "none";
    searching.style.display = null;
});

let renderer;


function inGame() {

    renderer = new Renderer();

    document.getElementById("menu").style.display = "none";
    document.getElementById("game").style.display = null;

    buttonContainer.style.display = null;
    searching.style.display = "none";
}
function restoreButtons(originalHTML) {
    buttonContainer.innerHTML = originalHTML;

    // Reattach the event listener to the private button
    document.getElementById("privateBtn").addEventListener("click", () => {
        privateBtn.click();
    });
}




// #endregion


const spriteCache = {};
let scaleResize;
let customScale = false;
// Render the world to the canvas
function renderWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Define field dimensions and scaling
    const fieldWidth = CONSTANTS.FIELD_WIDTH * CONSTANTS.SCALE;
    const fieldHeight = CONSTANTS.FIELD_HEIGHT * CONSTANTS.SCALE;
    const padding = 50;

    const scaleX = (canvas.width - padding * 2) / fieldWidth;
    const scaleY = (canvas.height - padding * 2) / fieldHeight;
    if (!customScale) scaleResize = Math.min(scaleX, scaleY);

    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    renderWalls(offsetX, offsetY, scaleResize);
    renderObjects(offsetX, offsetY, scaleResize);

    if (mousePos) {
        for (let id in objects) {
            const object = objects[id];
            if (object.socketId == ourId) {
                // Draw a small red dot
                ctx.beginPath();
                ctx.arc(mousePos.x + (canvas.width / 2) + (object.position.x * CONSTANTS.SCALE * scaleResize), mousePos.y + (canvas.height / 2) + (object.position.y * CONSTANTS.SCALE * scaleResize), 7.5, 0, Math.PI * 2); // x, y, radius, startAngle, endAngle
                ctx.fillStyle = "#4bff3b";
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}
function renderWalls(offsetX, offsetY, scaleResize) {
    if (!wallVertices) return;

    const lineWidth = 20 * scaleResize;
    const offsetAmount = (-lineWidth / 2) / (CONSTANTS.SCALE * scaleResize);

    ctx.strokeStyle = "#004404";
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();

    let offsetVertices = [];

    for (let i = 0; i < wallVertices.length; i++) {
        const curr = wallVertices[i];
        const next = wallVertices[(i + 1) % wallVertices.length];

        // Compute edge vector
        const edge = next.clone().sub(curr);
        const edgeNormal = new Vec2(-edge.y, edge.x).normalize(); // Perpendicular normal

        // Shift vertex by average of surrounding edge normals
        const prev = wallVertices[(i - 1 + wallVertices.length) % wallVertices.length];
        const prevEdge = curr.clone().sub(prev);
        const prevEdgeNormal = new Vec2(-prevEdge.y, prevEdge.x).normalize();

        const avgNormal = prevEdgeNormal.add(edgeNormal).normalize();
        offsetVertices.push(curr.clone().add(avgNormal.mul(offsetAmount)));
    }

    offsetVertices.forEach((vertex, i) => {
        const nextVertex = offsetVertices[(i + 1) % offsetVertices.length];

        // Convert field coordinates to screen space
        const x1 = offsetX + vertex.x * CONSTANTS.SCALE * scaleResize;
        const y1 = offsetY + vertex.y * CONSTANTS.SCALE * scaleResize;
        const x2 = offsetX + nextVertex.x * CONSTANTS.SCALE * scaleResize;
        const y2 = offsetY + nextVertex.y * CONSTANTS.SCALE * scaleResize;

        if (i === 0) ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    });

    ctx.closePath();
    ctx.stroke();
}


function renderObjects(offsetX, offsetY, scaleResize) {
    for (let id in objects) {
        const object = objects[id];

        ctx.save();
        ctx.translate(
            object.position.x * CONSTANTS.SCALE * scaleResize + offsetX,
            object.position.y * CONSTANTS.SCALE * scaleResize + offsetY
        );
        ctx.rotate(object.angle || 0);

        if (object.type === "circle" || object.type === "ball") {
            renderCircle(object, scaleResize);
        } else if (object.type === "rectangle" || object.type === "car") {
            renderRectangle(object, scaleResize);
        }
        if (object.name == "car" && object.boosting) {
            renderBooster(object, scaleResize);
        }

        ctx.restore();
    }
}

function renderBooster(car, scaleResize) {
    const boosterLength = 50 * scaleResize; // Length of the booster
    const boosterWidth = 30 * scaleResize; // Width of the booster

    const backX = 0;
    const backY = car.height * CONSTANTS.SCALE * scaleResize;

    const boosterPoints = [
        { x: backX - boosterWidth / 2, y: backY },
        { x: backX + boosterWidth / 2, y: backY },
        { x: backX, y: backY + boosterLength },
    ];

    ctx.beginPath();
    ctx.moveTo(boosterPoints[0].x, boosterPoints[0].y);
    ctx.lineTo(boosterPoints[1].x, boosterPoints[1].y);
    ctx.lineTo(boosterPoints[2].x, boosterPoints[2].y);
    ctx.closePath();
    ctx.fillStyle = "#f5e63d"; // Color of the booster
    ctx.fill();
}
function renderCircle(object, scaleResize) {
    if (object.sprite) {
        drawSprite(object, object.radius * 2 * CONSTANTS.SCALE * scaleResize);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, object.radius * CONSTANTS.SCALE * scaleResize, 0, 2 * Math.PI);
        ctx.fillStyle = object.color;
        ctx.fill();
    }
}

function renderRectangle(object, scaleResize) {
    if (object.sprite) {
        drawSprite(object, object.width * 2 * CONSTANTS.SCALE * scaleResize, object.height * 2 * CONSTANTS.SCALE * scaleResize);
    } else {
        ctx.fillStyle = object.color;
        ctx.fillRect(
            -object.width * CONSTANTS.SCALE * scaleResize,
            -object.height * CONSTANTS.SCALE * scaleResize,
            object.width * CONSTANTS.SCALE * scaleResize * 2,
            object.height * CONSTANTS.SCALE * scaleResize * 2
        );
    }
}

function drawSprite(object, width, height = width) {
    if (!spriteCache[object.sprite]) {
        const img = new Image();
        img.src = `assets/${object.sprite}.png`;
        spriteCache[object.sprite] = img;
    }
    const img = spriteCache[object.sprite];
    if (img.complete) {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
    }
}

function step() {
    renderWorld();
}

class Renderer {
    constructor() {
        this.currentServerState = {};
        this.previousServerState = {};
        this.lastServerUpdateTime = 0;

        this.updateInterval = 1000 / 60;

        this.animate = this.animate.bind(this);
        this.lastFrameTime = performance.now();

        this.FPS = 0;
        this.lastFPSUpdate = 0;
        this.lastServerFPSUpdate = 0;

        this.animate(this.lastFrameTime);
    }

    receiveServerState(newServerState, serverTimestamp) {
        this.previousServerState = { ...this.currentServerState };

        for (let id in newServerState) {
            this.currentServerState[id] = {
                ...newServerState[id],
                interpolate: newServerState[id].interpolate !== undefined ? newServerState[id].interpolate : true // Default to true if not specified
            };
        }

        let clientTime = performance.now();
        let networkLatency = clientTime - serverTimestamp;
        let adjustedServerTime = serverTimestamp + networkLatency / 2;

        if (this.lastServerUpdateTime) {
            let newUpdateInterval = adjustedServerTime - this.lastServerUpdateTime;
            this.updateInterval = this.smoothUpdateInterval(newUpdateInterval);

            if (performance.now() - this.lastServerFPSUpdate >= 1000) {
                console.log("Server FPS:", (1000 / this.updateInterval).toFixed(2));
                this.lastServerFPSUpdate = performance.now();
            }
        }

        this.lastServerUpdateTime = adjustedServerTime;
    }

    smoothUpdateInterval(newInterval) {
        const smoothingFactor = 0.1;
        this.smoothedInterval = this.smoothedInterval !== undefined ? (this.smoothedInterval * (1 - smoothingFactor)) + (newInterval * smoothingFactor) : newInterval;
        return this.smoothedInterval;
    }

    interpolateObject(object, prevState, currState, alpha) {
        if (!prevState || !currState) return;

        if (prevState.position && currState.position) {
            object.position = {
                x: prevState.position.x + alpha * (currState.position.x - prevState.position.x),
                y: prevState.position.y + alpha * (currState.position.y - prevState.position.y),
            };
        }

        if (prevState.angle !== undefined && currState.angle !== undefined) {
            object.angle = prevState.angle + alpha * (currState.angle - prevState.angle);
        }
    }

    animate(frameTime) {
        const deltaTime = frameTime - this.lastFrameTime;
        this.lastFrameTime = frameTime;

        const timeSinceUpdate = Date.now() - this.lastServerUpdateTime;
        const alpha = Math.min(timeSinceUpdate / this.updateInterval, 1);

        for (let id in this.currentServerState) {
            if (!objects) continue;
            const object = objects[id];
            const prevState = this.previousServerState[id];
            const currState = this.currentServerState[id];

            if (object) {
                if (currState.interpolate) {
                    this.interpolateObject(object, prevState, currState, alpha);
                } else {
                    object.position = currState.position;
                    object.angle = currState.angle;
                }
            }
        }

        step(deltaTime);

        if (performance.now() - this.lastFPSUpdate >= 1000) {
            this.FPS = 1000 / deltaTime;
            this.lastFPSUpdate = performance.now();
        }

        ctx.font = "20px Arial";
        ctx.fillStyle = "black";
        ctx.fillText(`FPS: ${Math.round(this.FPS)}`, 10, 30);

        requestAnimationFrame(this.animate);
    }

    step(deltaTime) {
        // Additional game logic or physics updates
    }
}

