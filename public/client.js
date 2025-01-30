const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.style.display = "none";

const CONSTANTS = window.CONSTANTS;

// Set canvas size to match the screen

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();


// Lock and hide the cursor on click
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
        console.log('Pointer lock enabled on canvas');
    } else {
        console.log('Pointer lock exited');
        mousePos = null;
        socket.emit("exit pointer lock");
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

socket.on("settings", _settings => {
    settings = _settings;
});

socket.on("your id", id => {
    ourId = id;
})
socket.on("mouse pos", pos => {
    mousePos = Vec2(pos);
});


socket.on("objects added", (_objects) => {
    for (let id in _objects) {
        let object = _objects[id];
        objects[id] = object;
    }
});

socket.on("object updates", (objectUpdates, timestamp) => {
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
        renderer.receiveServerState(interpolationObjectUpdates, timestamp);
    }
});

socket.on("objects removed", (ids) => {
    for (let id of ids) {
        delete objects[id];
    }
});

socket.on("game code", (code) => {
    console.log("The game code is", code);
    chatLog.value += "The game code is " + code + "\n";
});
socket.on("wall vertices", (_wallVertices) => {
    wallVertices = _wallVertices;
});

const countdownElement = document.getElementById("countdown");
const timerEl = document.getElementById("timer");


socket.on("countdown", (countdown) => {
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
document.addEventListener('keydown', (e) => {
    if (!e.repeat) socket.emit("keydown", e.key);

});

document.addEventListener('keyup', (e) => {
    if (!e.repeat) socket.emit("keyup", e.key);
});

document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas) {
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

document.getElementById("createGameBtn").addEventListener("click", (e) => {
    socket.emit("create game");
    document.getElementById("menu").style.display = "none";
    canvas.style.display = null;
});

document.getElementById("joinGameBtn").addEventListener("click", (e) => {
    let roomCode = prompt("Game code?");

    socket.emit("join game", roomCode);
    document.getElementById("menu").style.display = "none";
    canvas.style.display = null;

});

const chatInput = document.getElementById("chatInput")
const chatLog = document.getElementById("chatLog");

chatLog.value += "Type /settings for settings\n";
chatLog.value += "Type /controls for controls\n";

chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const msg = chatInput.value;

        if (msg.startsWith("/")) {
            const cmd = msg.slice(1).split(" ")[0];
            const args = msg.slice(1).split(" ").slice(1); // Extract the arguments

            if (cmd === "team") {
                if (args[0] === "left" || args[0] === "right") {
                    socket.emit("team", args[0]);
                }
            } else if (cmd === "start") {
                socket.emit("start");
            } else if (cmd === "settings") {
                chatLog.value += `
-- [Settings] --
Switch teams: /team <left/right>
Start game: /start

Sensitivity - mouse sensitivity
Current value: ${settings.sensitivity}
Set: /sensitivity <number>

Mouse range - how far the mouse can travel from the car
Current value: ${settings.mouseRange}
Set: /mouseRange <number>
                `.trim() + "\n";
            } else if (cmd == "sensitivity") {
                socket.emit("settings", { sensitivity: parseFloat(args[0]) });
                chatLog.value += "Sensitivity set!\n";
            } else if (cmd == "mouseRange") {
                socket.emit("settings", { mouseRange: parseFloat(args[0]) });
                chatLog.value += "Mouse range set!\n";
            } else if (cmd == "controls") {
                chatLog.value += `
Arrow keys = Move
Space = Boost
F = Flip
Shift = Tight turn

Mouse control mode:
Click the screen to enable
Move mouse = Aim car
WASD = Move around
Left click = Flip
Right click = Boost
                `.trim() + "\n";
            }

            chatLog.scrollTop = chatLog.scrollHeight;

        }

        chatInput.value = "";
    }
});




// #endregion


const spriteCache = {};

// Render the world to the canvas
function renderWorld() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);


    // Convert physics world coordinates to canvas coordinates (screen origin is at the center)
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    if (wallVertices) {
        // Render the field (walls) based on wallVertices
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.beginPath();

        // wallVertices should be an array of objects with x, y coordinates
        // Example: wallVertices = [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: -50, y: 50 }];

        for (let i = 0; i < wallVertices.length; i++) {
            const currentVertex = wallVertices[i];
            const nextVertex = wallVertices[(i + 1) % wallVertices.length]; // Connect to the next vertex, wrapping around

            const startX = offsetX + currentVertex.x * CONSTANTS.SCALE;
            const startY = offsetY + currentVertex.y * CONSTANTS.SCALE;
            const endX = offsetX + nextVertex.x * CONSTANTS.SCALE;
            const endY = offsetY + nextVertex.y * CONSTANTS.SCALE;

            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
        }

        ctx.stroke();

    }





    for (let id in objects) {
        const object = objects[id];

        if (object.type == "circle") {
            ctx.save();
            ctx.translate(
                object.position.x * CONSTANTS.SCALE + offsetX,
                object.position.y * CONSTANTS.SCALE + offsetY
            );
            ctx.rotate(object.angle || 0); // Rotate by object's angle, default to 0 if not set
            // console.log(object.angle);
            if (object.sprite) {
                // Check if the sprite is already loaded in the cache
                if (!spriteCache[object.sprite]) {
                    const img = new Image();
                    img.src = `assets/${object.sprite}.png`;
                    spriteCache[object.sprite] = img;
                }

                const img = spriteCache[object.sprite];

                // Ensure the image is loaded before trying to draw
                if (img.complete) {
                    const scaledRadius = object.radius * CONSTANTS.SCALE * 2;

                    ctx.drawImage(
                        img,
                        -scaledRadius / 2,
                        -scaledRadius / 2,
                        scaledRadius,
                        scaledRadius
                    );
                } else {
                    console.warn(`Sprite ${object.sprite} not yet loaded.`);
                }
            } else {
                // Fallback to circle rendering
                ctx.beginPath();
                ctx.arc(0, 0, object.radius * CONSTANTS.SCALE, 0, 2 * Math.PI);
                ctx.fillStyle = object.color;
                ctx.fill();
            }

            ctx.restore();
        } else if (object.type == "rectangle") {
            ctx.save();
            ctx.translate(object.position.x * CONSTANTS.SCALE + offsetX, object.position.y * CONSTANTS.SCALE + offsetY);
            ctx.rotate(object.angle);

            if (object.sprite) {
                // Check if the sprite is already loaded in the cache
                if (!spriteCache[object.sprite]) {
                    const img = new Image();
                    img.src = `assets/${object.sprite}.png`;
                    spriteCache[object.sprite] = img;
                }

                const img = spriteCache[object.sprite];

                // Ensure the image is loaded before trying to draw
                if (img.complete) {
                    const scaledWidth = object.width * CONSTANTS.SCALE * 2;
                    const scaledHeight = object.height * CONSTANTS.SCALE * 2;

                    ctx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                }
            } else {
                // Fallback to rectangle rendering
                ctx.fillStyle = object.color;
                ctx.fillRect(
                    -object.width * CONSTANTS.SCALE,
                    -object.height * CONSTANTS.SCALE,
                    object.width * CONSTANTS.SCALE * 2,
                    object.height * CONSTANTS.SCALE * 2
                );
            }

            if (object.name == "car" && object.boosting) {
                const boosterLength = 50; // Length of the booster
                const boosterWidth = 30; // Width of the booster

                const backX = 0;
                const backY = object.height * CONSTANTS.SCALE;

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

            ctx.restore();
        }
    }

    if (mousePos) {
        for (let id in objects) {
            const object = objects[id];
            if (object.socketId == ourId) {
                // Draw a small red dot
                ctx.beginPath();
                ctx.arc(mousePos.x + (canvas.width / 2) + (object.position.x * CONSTANTS.SCALE), mousePos.y + (canvas.height / 2) + (object.position.y * CONSTANTS.SCALE), 7.5, 0, Math.PI * 2); // x, y, radius, startAngle, endAngle
                ctx.fillStyle = "#4bff3b";
                ctx.fill();
                ctx.closePath();
            }
        }
    }

    // git remote set-url origin https://<your-username>@github.com/TheCowCoder/SwerveShot.git



    // Draw boost effect (red circle at the rear of the car)
    // if (playerInputs.boost) {
    //     let carAngle = car.getAngle() + Math.PI / 2;
    //     const backward = Vec2(Math.cos(carAngle), Math.sin(carAngle));
    //     const boostPos = car.getPosition().add(backward.mul(CAR_HEIGHT / 2)); // Position at the rear of the car
    //     ctx.beginPath();
    //     ctx.arc(boostPos.x * SCALE + offsetX, boostPos.y * SCALE + offsetY, 0.5 * SCALE, 0, 2 * Math.PI); // Small circle for boost effect
    //     ctx.fillStyle = "red";
    //     ctx.fill();
    // }
}

function step() {
    renderWorld();
}

// class Renderer {
//     constructor() {
//         this.serverDt = 1 / 10;
//         this.elapsedTime = 0;
//         this.serverAccumulator = 0;

//         this.currentTime = performance.now();

//         this.lastServerState = {};
//         this.currentServerState = {};

//         this.animate = this.animate.bind(this);
//         this.animate(performance.now());

//         this.frameCount = 0;
//         this.lastFrameTime = performance.now();
//         this.fps = 0;
//     }

//     receiveServerState(serverState) {
//         this.lastServerState = { ...this.currentServerState };
//         this.currentServerState = {};

//         for (let id in serverState) {
//             const newObject = serverState[id];
//             const lastObject = this.lastServerState[id];

//             // Snap to new position if the change is too large
//             if (
//                 lastObject &&
//                 newObject.position &&
//                 lastObject.position &&
//                 (Math.abs(newObject.position.x - lastObject.position.x) > 5 || // Threshold for snapping
//                     Math.abs(newObject.position.y - lastObject.position.y) > 5)
//             ) {
//                 this.lastServerState[id] = { ...newObject }; // Treat this as the new "last state"
//             }

//             this.currentServerState[id] = newObject;
//         }

//         // Reset accumulator to avoid drift
//         this.serverAccumulator = Math.min(this.serverAccumulator, this.serverDt);
//     }


//     interpolatePosition(lastPosition, currentPosition, alpha) {
//         if (!lastPosition || !currentPosition) return currentPosition || lastPosition;
//         return {
//             x: lastPosition.x * (1 - alpha) + currentPosition.x * alpha,
//             y: lastPosition.y * (1 - alpha) + currentPosition.y * alpha,
//         };
//     }

//     interpolateAngle(lastAngle, currentAngle, alpha) {
//         if (lastAngle === undefined || currentAngle === undefined) return currentAngle || lastAngle;

//         const deltaAngle = ((currentAngle - lastAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
//         return lastAngle + deltaAngle * alpha;
//     }

//     interpolate() {
//         let interpolatedStates = {};
//         const alpha = Math.max(0, Math.min(this.serverAccumulator / this.serverDt, 1)); // Ensure alpha is between 0 and 1

//         for (let id in this.currentServerState) {
//             const current = this.currentServerState[id];
//             const last = this.lastServerState[id] || { ...current }; // Use current as fallback

//             interpolatedStates[id] = {
//                 position: this.interpolatePosition(last.position, current.position, alpha),
//                 angle: this.interpolateAngle(last.angle, current.angle, alpha),
//             };
//         }

//         return interpolatedStates;
//     }

//     animate() {
//         const newTime = performance.now();
//         let frameTime = (newTime - this.currentTime) / 1000;

//         // Cap frame time to prevent large jumps
//         if (frameTime > 0.25) frameTime = 0.25;
//         this.currentTime = newTime;
//         this.serverAccumulator += frameTime;

//         // Process fixed server updates
//         while (this.serverAccumulator >= this.serverDt) {
//             this.serverAccumulator -= this.serverDt;
//         }

//         // Perform interpolation
//         const interpolatedStates = this.interpolate();
//         for (let id in interpolatedStates) {
//             const { position, angle } = interpolatedStates[id];
//             const object = objects[id];

//             if (position) object.position = position;
//             if (angle !== undefined) object.angle = angle;
//         }

//         // for (let id in this.currentServerState) {
//         //     const { position, angle } = this.currentServerState[id];
//         //     const object = objects[id];

//         //     if (position) object.position = position;
//         //     if (angle !== undefined) object.angle = angle;
//         // }

//         // FPS calculation
//         this.frameCount++;
//         if (newTime - this.lastFrameTime >= 1000) {
//             this.fps = this.frameCount;
//             this.frameCount = 0;
//             this.lastFrameTime = newTime;
//         }

//         // Render and display FPS
//         step();

//         ctx.fillStyle = 'black';
//         ctx.font = '16px Arial';
//         ctx.fillText(`FPS: ${this.fps}`, 10, 20);

//         requestAnimationFrame(this.animate);
//     }
// }

// const renderer = new Renderer();

class Renderer {
    constructor() {
        this.currentServerState = {}; // Most recent server state from server
        this.previousServerState = {}; // Previous server state from server
        this.lastServerUpdateTime = 0; // Time of the previous server update

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
        this.currentServerState = { ...newServerState };
    
        let clientTime = performance.now(); 
        let networkLatency = clientTime - serverTimestamp; 
        let adjustedServerTime = serverTimestamp + networkLatency / 2; // Adjust the server time for latency
    
        if (this.lastServerUpdateTime) {
            let newUpdateInterval = adjustedServerTime - this.lastServerUpdateTime;
            
            // Stabilize update interval to avoid extreme fluctuations
            this.updateInterval = this.smoothUpdateInterval(newUpdateInterval);

            if (performance.now() - this.lastServerFPSUpdate >= 1000) {
                console.log("Server FPS:", (1000 / this.updateInterval).toFixed(2));

                this.lastServerFPSUpdate = performance.now();
            }

        }
    
        this.lastServerUpdateTime = adjustedServerTime;
    }
    
    // Function to smooth the update interval calculation
    smoothUpdateInterval(newInterval) {
        // Use a smoothing factor to make the update interval more stable
        const smoothingFactor = 0.1; // Adjust this value for more/less smoothing
        this.smoothedInterval = this.smoothedInterval !== undefined ? (this.smoothedInterval * (1 - smoothingFactor)) + (newInterval * smoothingFactor) : newInterval;
        return this.smoothedInterval;
    }

        
    

    interpolateObject(object, prevState, currState, alpha) {
        if (!prevState || !currState) return;

        // Interpolate position
        if (prevState.position && currState.position) {
            object.position = {
                x: prevState.position.x + alpha * (currState.position.x - prevState.position.x),
                y: prevState.position.y + alpha * (currState.position.y - prevState.position.y),
            };
        }

        // Interpolate angle
        if (prevState.angle !== undefined && currState.angle !== undefined) {
            object.angle = prevState.angle + alpha * (currState.angle - prevState.angle);
        }
    }

    animate(frameTime) {
        const deltaTime = frameTime - this.lastFrameTime;
        this.lastFrameTime = frameTime;
    
        // Use a stable updateInterval based on the server's time adjustment
        const timeSinceUpdate = Date.now() - this.lastServerUpdateTime;
        const alpha = Math.min(timeSinceUpdate / this.updateInterval, 1); // Ensure alpha is between 0 and 1
    
        // Interpolate objects smoothly based on the time elapsed
        for (let id in this.currentServerState) {
            const object = objects[id];
            const prevState = this.previousServerState[id];
            const currState = this.currentServerState[id];
    
            if (object) {
                this.interpolateObject(object, prevState, currState, alpha);
            }
        }
    
        // Step function for any additional game logic or physics updates
        step(deltaTime);
    
        // Calculate and log FPS in a stable manner
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
        // Add game logic or physics updates here if needed
    }
}
const renderer = new Renderer();