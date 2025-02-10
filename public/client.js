import Camera from './Camera.js';
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


const CONSTANTS = window.CONSTANTS;
const Vec2 = window.Vec2;

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


const camera = new Camera(CONSTANTS.SCALE, canvas);



let objects = {};
let wallVertices;



// #region Socket events

let socket = io({ reconnection: false });
let ourId;
let mousePos;
let settings;

let debugDot;

socket.on("debug dot", (pos) => {
    pos = Vec2(pos.x * CONSTANTS.SCALE + canvas.width / 2, pos.y * CONSTANTS.SCALE + canvas.height / 2);
    debugDot = pos;
});
socket.on("game stats", (stats) => {

    // Set game type
    document.getElementById("gameType").textContent = stats.type;

    // Get containers
    const leftStatsBody = document.getElementById("leftStatsBody");
    const rightStatsBody = document.getElementById("rightStatsBody");

    // Clear previous data
    leftStatsBody.innerHTML = "";
    rightStatsBody.innerHTML = "";

    // Populate teams and stats
    Object.entries(stats.players).forEach(([playerId, playerData]) => {

        const statsRow = document.createElement("tr");
        statsRow.innerHTML = `
            <td>${playerData.username}</td>
            <td>${playerData.goals}</td>
            <td>${playerData.ballTouches}</td>
            <td>${playerData.flipsUsed}</td>
            <td>${playerData.boostUsed}</td>
        `;

        if (playerData.team === "blue") {
            leftStatsBody.appendChild(statsRow);
        } else {
            rightStatsBody.appendChild(statsRow);
        }

    });

    // Show the popup
    document.getElementById("gameStatsPopup").style.display = "block";
});

// Close popup event
document.getElementById("closeStats").addEventListener("click", () => {
    document.getElementById("gameStatsPopup").style.display = "none";
});


socket.on("chat", (sender, msg) => {
    chatLog.value += `${sender}: ${msg}\n`;
});
socket.on("match made", () => {
    socket.emit("settings", {
        username: usernameInp.value
    });

    inGame();
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
        if (object.position) object.position = Vec2(object.position);

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
}


socket.on("wall vertices", (_wallVertices) => {
    wallVertices = [];
    for (let v of _wallVertices) {
        wallVertices.push(Vec2(v));
    }
});

const countdownElement = document.getElementById("countdown");
const timerEl = document.getElementById("timer");


socket.on("game start", () => {
    document.getElementById("leftScore").innerText = "0";
    document.getElementById("rightScore").innerText = "0";

})
socket.on("countdown", (countdown) => {
    countdownElement.style.display = null;
    countdownElement.textContent = countdown;

    if (countdown === 0) {
        countdownElement.textContent = "";
        countdownElement.style.display = "none";
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
    if (team === "blue") {
        let rightScoreElement = document.getElementById("rightScore");
        let currentScore = parseInt(rightScoreElement.innerText);
        rightScoreElement.innerText = currentScore + 1;
    } else if (team === "red") {
        let leftScoreElement = document.getElementById("leftScore");
        let currentScore = parseInt(leftScoreElement.innerText);
        leftScoreElement.innerText = currentScore + 1;
    }
});



// #endregion


// #region Document events
document.getElementById("game").style.display = "none";


let leftLateralIndicator;
let rightLateralIndicator;

document.addEventListener('keydown', (e) => {
    if (!e.repeat) socket.emit("keydown", e.key);
    if (e.key === "Escape") {
        customScale = false;
        scaleBtn.style.display = "none";
        camera.setScale(1);
    } else if (e.key == "a") {
        leftLateralIndicator = true;
    } else if (e.key == "d") {
        rightLateralIndicator = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (!e.repeat) socket.emit("keyup", e.key);
    if (e.key == "a") {
        leftLateralIndicator = false;
    } else if (e.key == "d") {
        rightLateralIndicator = false;
    }
});

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas && !exittingPointerLock) {
        socket.emit("mousemove", event.movementX, event.movementY, canvas.width, canvas.height);
    }

});

document.addEventListener("mousedown", e => {
    socket.emit("mousedown", e.button);
});
document.addEventListener("mouseup", e => {
    socket.emit("mouseup", e.button);
});

let customScale;

document.addEventListener("wheel", (e) => {
    camera.setScale(camera.scale + e.deltaY * 0.00025);
    customScale = true;
    scaleBtn.style.display = null;
    e.preventDefault();
});


// #region UI Control



let settingsBtn = document.getElementById("settingsBtn");
let overlay = document.getElementById("overlay");
let closeBtn = document.getElementById("closeBtn");



let arrowKeysF = document.getElementById("arrowKeysFR");
let keyboardControls = document.getElementById("keyboardControls");
let mouseControls = document.getElementById("mouseControls");
let reset = document.getElementById("reset");

arrowKeysF.addEventListener("click", () => {
    socket.emit("preset", "arrowKeysFR");
    overlay.style.display = "none";
});
keyboardControls.addEventListener("click", () => {
    socket.emit("preset", "keyboardControls");
    overlay.style.display = "none";

});
mouseControls.addEventListener("click", () => {
    socket.emit("preset", "mouseControls");
    overlay.style.display = "none";

});
reset.addEventListener("click", () => {
    socket.emit("preset", "default");
    overlay.style.display = "none";
});

let blueBotBtn = document.getElementById("spawnBlueBot");
let redBotBtn = document.getElementById("spawnRedBot");

blueBotBtn.addEventListener("click", () => {
    socket.emit("bot", "blue");
});
redBotBtn.addEventListener("click", () => {
    socket.emit("bot", "red");
});


const defaultSettings = {
    mouseRange: 300,
    sensitivity: 1.75,
    username: ""
};

// Check if 'settings' exists in localStorage
let storageSettings = localStorage.getItem('settings');

if (!storageSettings) {
    // If not found, store default settings
    localStorage.setItem('settings', JSON.stringify(defaultSettings));
    settings = defaultSettings;
} else {
    settings = JSON.parse(storageSettings);
}

let usernameInp = document.getElementById("usernameInp");

document.getElementById("mouseRange").value = settings.mouseRange;
document.getElementById("mouseSensitivity").value = settings.sensitivity;
usernameInp.value = settings.username;

usernameInp.addEventListener("input", () => {
    settings.username = usernameInp.value;

    localStorage.setItem("settings", JSON.stringify(settings));
})


settingsBtn.addEventListener("click", () => {
    overlay.style.display = "flex"; // Show overlay
});

closeBtn.addEventListener("click", () => {
    overlay.style.display = "none"; // Hide overlay
});

document.getElementById("saveBtn").addEventListener("click", () => {
    let team = document.getElementById("team").value;
    socket.emit("team", team);

    let sensitivity = document.getElementById("mouseSensitivity").value;
    let mouseRange = document.getElementById("mouseRange").value;

    let newSettings = {
        sensitivity,
        mouseRange,
    };
    socket.emit("settings", newSettings, (result) => {
        if (result) {
            overlay.style.display = "none";

        } else {
            alert("Join a game before setting settings!");
        }
    });

    localStorage.setItem('settings', JSON.stringify(newSettings));

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


chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const msg = chatInput.value;

        if (msg.startsWith("/")) {
            const cmd = msg.slice(1).split(" ")[0];
            const args = msg.slice(1).split(" ").slice(1); // Extract the arguments

            if (cmd == "time") {
                socket.emit("time", parseInt(args[0]));
            } else if (cmd == "s") {
                document.getElementById("gameStatsPopup").style.display = "block";
            } else if (cmd == "bot") {
                socket.emit("bot");
            } else if (cmd == "bs") {
                socket.emit("bs");
            }
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
    camera.setScale(1);

});

let buttonContainer = document.getElementById("buttons");
let botsBtn = document.getElementById("botsBtn");


botsBtn.addEventListener("click", () => {

    // Store original buttons
    let originalButtons = buttonContainer.innerHTML;

    // Replace buttons with "Create Room" and "Join Room"
    buttonContainer.innerHTML = `
        <div>
            <button class="menu-btn" id="oneVOneBot"><span>1v1 A Bot!</span></button>
            <button class="menu-btn" id="oneVTwoBots"><span>1v2 Bots!</span></button>
            <button class="menu-btn" id="oneVThreeBots"><span>1v3 Bots!</span></button>
        </div>
    `;


    function startGame() {
        socket.emit("create game", (code) => {
            chatLog.value += "The game code is " + code + "\n";
            chatLog.value += "The game code is copied to clipboard!\n";
            copyToClipboard(code);

            let comp = prompt("Competitive controls (same as bot) Y/N");

            if (comp.toUpperCase() == "Y") {
                socket.emit("preset", "arrowKeysFR");
            }

            inGame();

            socket.emit("settings", {
                username: usernameInp.value
            });

            restoreButtons(originalButtons);
            inGame();

            setTimeout(() => {
                socket.emit("start");
            }, 5000);
        });

    }


    // Add event listeners to new buttons
    document.getElementById("oneVOneBot").addEventListener("click", () => {
        startGame();
        socket.emit("bot", "red");
    });
    document.getElementById("oneVTwoBots").addEventListener("click", () => {
        startGame();
        socket.emit("bot", "red");
        socket.emit("bot", "red");
    });
    document.getElementById("oneVThreeBots").addEventListener("click", () => {
        startGame();
        socket.emit("bot", "red");
        socket.emit("bot", "red");
        socket.emit("bot", "red");
    });


});


let privateBtn = document.getElementById("privateBtn");
let oneVOneBtn = document.getElementById("oneVOneBtn");
let twoVTwoBtn = document.getElementById("twoVTwoBtn");


privateBtn.addEventListener("click", () => {
    if (!usernameInp.value) return alert("Please choose a username ;) !");


    // Store original buttons
    let originalButtons = buttonContainer.innerHTML;

    // Replace buttons with "Create Room" and "Join Room"
    buttonContainer.innerHTML = `
        <div>
            <button class="menu-btn" id="createRoomBtn"><span>Create Room</span></button>
            <button class="menu-btn" id="joinRoomBtn"><span>Join Room</span></button>
        </div>
    `;


    // Add event listeners to new buttons
    document.getElementById("createRoomBtn").addEventListener("click", () => {
        socket.emit("create game", (code) => {
            chatLog.value += "The game code is " + code + "\n";
            chatLog.value += "The game code is copied to clipboard!\n";
            copyToClipboard(code);

            inGame();

            socket.emit("settings", {
                username: usernameInp.value
            });
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

                socket.emit("settings", {
                    username: usernameInp.value
                });
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
    if (!usernameInp.value) return alert("Please choose a username");

    socket.emit("queue", "1v1");
    buttonContainer.style.display = "none";
    searching.style.display = null;
});

twoVTwoBtn.addEventListener("click", (e) => {
    if (!usernameInp.value) return alert("Please choose a username");

    socket.emit("queue", "2v2");
    buttonContainer.style.display = "none";
    searching.style.display = null;
});


threeVThreeBtn.addEventListener("click", (e) => {
    if (!usernameInp.value) return alert("Please choose a username");

    socket.emit("queue", "3v3");
    buttonContainer.style.display = "none";
    searching.style.display = null;
});


// #endregion
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
function renderWorld() {
    ctx.save(); // Save the current transformation state
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    ctx.restore(); // Restore the saved transformation state


    // Define field dimensions and scaling
    const fieldWidth = CONSTANTS.FIELD_WIDTH * CONSTANTS.SCALE;
    const fieldHeight = CONSTANTS.FIELD_HEIGHT * CONSTANTS.SCALE;
    const padding = 50;

    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    renderFieldLines(offsetX, offsetY);
    renderWalls(offsetX, offsetY);
    renderObjects(offsetX, offsetY);

    if (debugDot) {
        ctx.beginPath();
        ctx.arc(debugDot.x, debugDot.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.closePath();
    }


    // Draw mouse position dot
    if (mousePos) {
        for (let id in objects) {
            const object = objects[id];
            if (object.socketId == ourId) {
                ctx.beginPath();
                ctx.arc(mousePos.x + (canvas.width / 2) + (object.position.x * CONSTANTS.SCALE), mousePos.y + (canvas.height / 2) + (object.position.y * CONSTANTS.SCALE), 7.5, 0, Math.PI * 2); // x, y, radius, startAngle, endAngle
                ctx.fillStyle = "#4bff3b";
                ctx.fill();
                ctx.closePath();
            }
        }
    }


}


function renderFieldLines(offsetX, offsetY) {
    const lineWidth = 5;
    ctx.strokeStyle = "black";
    ctx.lineWidth = lineWidth;

    // Center Line
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY - CONSTANTS.FIELD_HEIGHT / 2 * CONSTANTS.SCALE);
    ctx.lineTo(offsetX, offsetY + CONSTANTS.FIELD_HEIGHT / 2 * CONSTANTS.SCALE);
    ctx.stroke();



    // Goal Area Lines



    let rightGoal = [
        Vec2(CONSTANTS.FIELD_WIDTH / 2, -CONSTANTS.GOAL_SIZE / 2),
        Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, -CONSTANTS.GOAL_SIZE / 2),
        Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, CONSTANTS.GOAL_SIZE / 2),
        Vec2(CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.GOAL_SIZE / 2)
    ];

    let leftGoal = [
        Vec2(-CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.GOAL_SIZE / 2),
        Vec2(-CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, CONSTANTS.GOAL_SIZE / 2),
        Vec2(-CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, -CONSTANTS.GOAL_SIZE / 2),
        Vec2(-CONSTANTS.FIELD_WIDTH / 2, -CONSTANTS.GOAL_SIZE / 2)
    ];




    ctx.beginPath();
    ctx.moveTo(offsetX + rightGoal[0].x * CONSTANTS.SCALE, offsetY + rightGoal[0].y * CONSTANTS.SCALE);
    ctx.lineTo(offsetX + rightGoal[3].x * CONSTANTS.SCALE, offsetY + rightGoal[3].y * CONSTANTS.SCALE);
    ctx.stroke();


    ctx.beginPath();
    ctx.moveTo(offsetX + leftGoal[0].x * CONSTANTS.SCALE, offsetY + leftGoal[0].y * CONSTANTS.SCALE);
    ctx.lineTo(offsetX + leftGoal[3].x * CONSTANTS.SCALE, offsetY + leftGoal[3].y * CONSTANTS.SCALE);
    ctx.stroke();


    // Center Circle
    ctx.beginPath();
    ctx.arc(offsetX, offsetY, 7.5 * CONSTANTS.SCALE, 0, 2 * Math.PI);
    ctx.stroke();

    // Center Dot
    ctx.beginPath();
    ctx.arc(offsetX, offsetY, CONSTANTS.BALL_RADIUS * CONSTANTS.SCALE, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
}



function renderWalls(offsetX, offsetY) {
    if (!wallVertices) return;

    const lineWidth = 20;
    const offsetAmount = (-lineWidth / 2) / (CONSTANTS.SCALE);

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
        const edgeNormal = Vec2(-edge.y, edge.x).normalize(); // Perpendicular normal

        // Shift vertex by average of surrounding edge normals
        const prev = wallVertices[(i - 1 + wallVertices.length) % wallVertices.length];
        const prevEdge = curr.clone().sub(prev);
        const prevEdgeNormal = Vec2(-prevEdge.y, prevEdge.x).normalize();

        const avgNormal = prevEdgeNormal.add(edgeNormal).normalize();
        offsetVertices.push(curr.clone().add(avgNormal.mul(offsetAmount)));
    }

    offsetVertices.forEach((vertex, i) => {
        const nextVertex = offsetVertices[(i + 1) % offsetVertices.length];

        // Convert field coordinates to screen space
        const x1 = offsetX + vertex.x * CONSTANTS.SCALE;
        const y1 = offsetY + vertex.y * CONSTANTS.SCALE;
        const x2 = offsetX + nextVertex.x * CONSTANTS.SCALE;
        const y2 = offsetY + nextVertex.y * CONSTANTS.SCALE;

        if (i === 0) ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    });

    ctx.closePath();
    ctx.stroke();
}


function renderObjects(offsetX, offsetY) {
    for (let id in objects) {
        const object = objects[id];

        ctx.save();
        ctx.translate(
            object.position.x * CONSTANTS.SCALE + offsetX,
            object.position.y * CONSTANTS.SCALE + offsetY
        );
        ctx.rotate(object.angle || 0);

        if (object.type === "circle" || object.type === "ball") {
            renderCircle(object);
        } else if (object.type === "rectangle" || object.type === "car") {
            renderRectangle(object);
        }
        if (object.name == "car" && object.boosting) {
            renderBooster(object);
        }

        ctx.restore();
    }
}

function renderBooster(car) {
    const boosterLength = 50; // Length of the booster
    const boosterWidth = 30; // Width of the booster

    const backX = 0;
    const backY = car.height * CONSTANTS.SCALE;

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
function renderCircle(object) {
    if (object.sprite) {
        drawSprite(object, object.radius * 2 * CONSTANTS.SCALE);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, object.radius * CONSTANTS.SCALE, 0, 2 * Math.PI);
        ctx.fillStyle = object.color;
        ctx.fill();
    }
}

function renderRectangle(object) {
    if (object.sprite) {
        drawSprite(object, object.width * 2 * CONSTANTS.SCALE, object.height * 2 * CONSTANTS.SCALE);
    } else {
        ctx.fillStyle = object.color;
        ctx.fillRect(
            -object.width * CONSTANTS.SCALE,
            -object.height * CONSTANTS.SCALE,
            object.width * CONSTANTS.SCALE * 2,
            object.height * CONSTANTS.SCALE * 2
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
    camera.applyTransform(ctx);

    renderWorld();


    let ourCar;
    for (let id in objects) {
        const obj = objects[id];
        if (obj.socketId == ourId) {
            ourCar = obj;
        }
    }


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

            if (performance.now() - this.lastServerFPSUpdate >= 5000) {
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
            object.position = Vec2(
                prevState.position.x + alpha * (currState.position.x - prevState.position.x),
                prevState.position.y + alpha * (currState.position.y - prevState.position.y),
            );
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

                // Camera follows our car with smooth lag
                if (object.socketId == ourId) {
                    camera.setPosition(object.position);

                    // const cameraLagFactor = 0.05; // Adjust to control lag effect
                    // camera.setPosition(Vec2(
                    //     camera.position.x + cameraLagFactor * (object.position.x - camera.position.x),
                    //     camera.position.y + cameraLagFactor * (object.position.y - camera.position.y)
                    // ));

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
        ctx.textAlign = "blue";
        ctx.textBaseline = "top";

        let topLeft = camera.screenToWorld(Vec2(10, 10));
        let textPos = Vec2(topLeft.x * CONSTANTS.SCALE + canvas.width / 2, topLeft.y * CONSTANTS.SCALE + canvas.height / 2)
        ctx.fillText(`FPS: ${Math.round(this.FPS)}`, textPos.x, textPos.y);

        requestAnimationFrame(this.animate);
    }

}

