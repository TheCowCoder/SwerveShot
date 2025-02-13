
import Camera from './Camera.js';
import { io } from "socket.io-client";
import * as PIXI from 'pixi.js';
import { stringToHex } from '@pixi/utils';
import "./index.css";
import * as CONSTANTS from "../shared/CONSTANTS.js";
import { Vec2 } from "../shared/Vec2.js";

// Global variables
let debugDot;
let exittingPointerLock = false;
let objects = {};
let wallVertices;


let camera;
let app;
let uiContainer;
let worldContainer;

function setupPixi() {

    // Create a Pixi Application using your existing canvas element
    app = new PIXI.Application({
        view: document.getElementById('gameCanvas'),
        resizeTo: window,
        backgroundColor: 0x3a9f58,
        antialias: true
    });
    const canvas = app.view; // for pointer lock etc.


    // Lock and hide the cursor on click
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

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

    // Create the camera instance (ensure your Camera class works with PIXI containers)
    camera = new Camera(CONSTANTS.SCALE, app);

    // Create a container for all world objects so that the camera transform can be applied
    worldContainer = new PIXI.Container();
    camera.container.addChild(worldContainer);

    // Create a separate container for UI overlays (like FPS text) that should not be transformed by the camera
    uiContainer = new PIXI.Container();
    camera.container.addChild(uiContainer);

    app.view.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === app.view && !exittingPointerLock) {
            socket.emit("mousemove", event.movementX, event.movementY, app.view.width, app.view.height);
        }
    });

    app.view.addEventListener("mousedown", (e) => {
        socket.emit("mousedown", e.button);
    });

    app.view.addEventListener("mouseup", (e) => {
        socket.emit("mouseup", e.button);
    });

    app.view.addEventListener("wheel", (e) => {
        camera.setScale(camera.scale + e.deltaY * 0.00025);
        customScale = true;
        scaleBtn.style.display = null;
        e.preventDefault();
    });

}



// #region Socket events

let socket = io({ reconnection: false });
let ourId;
let mousePos;
let settings;



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
window.addEventListener('keydown', (e) => {
    if (!e.repeat) socket.emit("keydown", e.key);
    if (e.key === "Escape") {
        customScale = false;
        scaleBtn.style.display = "none";
        camera.setScale(1);
    } else if (e.key === "a") {
        leftLateralIndicator = true;
    } else if (e.key === "d") {
        rightLateralIndicator = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (!e.repeat) socket.emit("keyup", e.key);
    if (e.key === "a") {
        leftLateralIndicator = false;
    } else if (e.key === "d") {
        rightLateralIndicator = false;
    }
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
let noBoostFlip = document.getElementById("noBoostFlip");
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

noBoostFlip.addEventListener("click", () => {
    socket.emit("preset", "noBoostFlip");
    overlay.style.display = "none";
})
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


// let dribbleMagnetBtn = document.getElementById("dribbleMagnet");
// dribbleMagnetBtn.addEventListener("click", () => {

// });


const defaultSettings = {
    mouseRange: 300,
    sensitivity: 1.5,
    username: "",
    dribbleMagnet: true,
    relativeMovement: true
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
document.getElementById("dribbleMagnet").checked = settings.dribbleMagnet;
document.getElementById("relativeMovement").checked = settings.relativeMovement;

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
    let dribbleMagnet = document.getElementById("dribbleMagnet").checked;
    let relativeMovement = document.getElementById("relativeMovement").checked;

    let newSettings = {
        sensitivity,
        mouseRange,
        dribbleMagnet,
        relativeMovement
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
            } else if (cmd == "team") {
                socket.emit("team", args[0]);
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


    function startGame(gameMode) {
        let comp = prompt("Competitive controls (same as bot) Y/N");
        let skillLevel = parseFloat(prompt("Bot Skill level? (0-1)"));

        socket.emit("create game", (code) => {
            chatLog.value += "The game code is " + code + "\n";
            chatLog.value += "The game code is copied to clipboard!\n";
            copyToClipboard(code);

            if (comp.toUpperCase() == "Y") {
                socket.emit("preset", "arrowKeysFR");
            }

            if (gameMode == "1v1") {
                socket.emit("bot", "red");
            } else if (gameMode == "1v2") {
                socket.emit("bot", "red");
                socket.emit("bot", "red");
            } else if (gameMode == "1v3") {
                socket.emit("bot", "red");
                socket.emit("bot", "red");
                socket.emit("bot", "red");
            }


            if (skillLevel != null || skillLevel != undefined) {
                console.log("emitting bot skill", skillLevel);
                socket.emit("bot skill", skillLevel);
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
        startGame("1v1");
    });
    document.getElementById("oneVTwoBots").addEventListener("click", () => {
        startGame("1v2");
    });
    document.getElementById("oneVThreeBots").addEventListener("click", () => {
        startGame("1v3");
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
    // console.log(document.getElementById("privateBtn"));

    // // Reattach the event listener to the private button
    // document.getElementById("privateBtn").addEventListener("click", () => {
    //     privateBtn.click();
    // });
}




// #endregion



const spriteCache = {};


//
// Rendering functions (all using Pixi.js)
//

function renderWorld() {
    // Clear previous frame’s world drawings:
    worldContainer.removeChildren();

    // Field dimensions and screen offsets
    const offsetX = app.renderer.width / 2;
    const offsetY = app.renderer.height / 2;

    renderFieldLines(offsetX, offsetY);
    renderWalls(offsetX, offsetY);
    renderObjects(offsetX, offsetY);

    // Draw debug dot if set (using red fill)
    if (debugDot) {
        let g = new PIXI.Graphics();
        g.beginFill(0xff0000);
        g.drawCircle(debugDot.x, debugDot.y, 10);
        g.endFill();
        worldContainer.addChild(g);
    }

    // Draw the mouse position dot for our object
    if (mousePos) {
        for (let id in objects) {
            const object = objects[id];
            if (object.socketId == ourId) {
                let g = new PIXI.Graphics();
                g.beginFill(0x4bff3b); // equivalent to "#4bff3b"
                const x = mousePos.x + (app.renderer.width / 2) + (object.position.x * CONSTANTS.SCALE);
                const y = mousePos.y + (app.renderer.height / 2) + (object.position.y * CONSTANTS.SCALE);
                g.drawCircle(x, y, 7.5);
                g.endFill();
                worldContainer.addChild(g);
            }
        }
    }
}

function renderFieldLines(offsetX, offsetY) {
    let g = new PIXI.Graphics();
    const lineWidth = 5;
    g.lineStyle(lineWidth, 0x000000);

    // Center Line
    g.moveTo(offsetX, offsetY - (CONSTANTS.FIELD_HEIGHT / 2 * CONSTANTS.SCALE));
    g.lineTo(offsetX, offsetY + (CONSTANTS.FIELD_HEIGHT / 2 * CONSTANTS.SCALE));

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

    // Right goal line
    g.moveTo(offsetX + rightGoal[0].x * CONSTANTS.SCALE, offsetY + rightGoal[0].y * CONSTANTS.SCALE);
    g.lineTo(offsetX + rightGoal[3].x * CONSTANTS.SCALE, offsetY + rightGoal[3].y * CONSTANTS.SCALE);

    // Left goal line
    g.moveTo(offsetX + leftGoal[0].x * CONSTANTS.SCALE, offsetY + leftGoal[0].y * CONSTANTS.SCALE);
    g.lineTo(offsetX + leftGoal[3].x * CONSTANTS.SCALE, offsetY + leftGoal[3].y * CONSTANTS.SCALE);

    // Center Circle (stroke only)
    g.lineStyle(lineWidth, 0x000000);
    g.drawCircle(offsetX, offsetY, 7.5 * CONSTANTS.SCALE);

    // Center Dot (filled)
    g.beginFill(0x000000);
    g.drawCircle(offsetX, offsetY, CONSTANTS.BALL_RADIUS * CONSTANTS.SCALE);
    g.endFill();

    worldContainer.addChild(g);
}

function renderWalls(offsetX, offsetY) {
    if (!wallVertices) return;
    let g = new PIXI.Graphics();
    const lineWidth = 20;
    const offsetAmount = (-lineWidth / 2) / (CONSTANTS.SCALE);
    g.lineStyle(lineWidth, 0x004404);
    g.lineJoin = "round";
    g.lineCap = "round";

    let offsetVertices = [];
    for (let i = 0; i < wallVertices.length; i++) {
        const curr = wallVertices[i];
        const next = wallVertices[(i + 1) % wallVertices.length];

        // Compute edge vector and its perpendicular (normal)
        const edge = next.clone().sub(curr);
        const edgeNormal = Vec2(-edge.y, edge.x).normalize();

        const prev = wallVertices[(i - 1 + wallVertices.length) % wallVertices.length];
        const prevEdge = curr.clone().sub(prev);
        const prevEdgeNormal = Vec2(-prevEdge.y, prevEdge.x).normalize();

        const avgNormal = prevEdgeNormal.add(edgeNormal).normalize();
        offsetVertices.push(curr.clone().add(avgNormal.mul(offsetAmount)));
    }

    // Draw the wall polygon
    g.moveTo(offsetX + offsetVertices[0].x * CONSTANTS.SCALE, offsetY + offsetVertices[0].y * CONSTANTS.SCALE);
    for (let i = 1; i < offsetVertices.length; i++) {
        const vertex = offsetVertices[i];
        g.lineTo(offsetX + vertex.x * CONSTANTS.SCALE, offsetY + vertex.y * CONSTANTS.SCALE);
    }
    // Close the path
    g.lineTo(offsetX + offsetVertices[0].x * CONSTANTS.SCALE, offsetY + offsetVertices[0].y * CONSTANTS.SCALE);

    worldContainer.addChild(g);
}

function renderObjects(offsetX, offsetY) {
    for (let id in objects) {
        const object = objects[id];

        // Create a container per object to apply translation & rotation
        let objContainer = new PIXI.Container();
        objContainer.x = object.position.x * CONSTANTS.SCALE + offsetX;
        objContainer.y = object.position.y * CONSTANTS.SCALE + offsetY;
        objContainer.rotation = object.angle || 0;

        if (object.type === "circle" || object.type === "ball") {
            renderCircle(object, objContainer);
        } else if (object.type === "rectangle" || object.type === "car") {
            renderRectangle(object, objContainer);
        }
        if (object.name == "car" && object.boosting) {
            renderBooster(object, objContainer);
        }

        worldContainer.addChild(objContainer);
    }
}

function renderBooster(car, container) {
    const boosterLength = 50; // Length of the booster
    const boosterWidth = 30;  // Width of the booster
    const backX = 0;
    const backY = car.height * CONSTANTS.SCALE;

    let g = new PIXI.Graphics();
    g.beginFill(0xf5e63d);
    g.moveTo(backX - boosterWidth / 2, backY);
    g.lineTo(backX + boosterWidth / 2, backY);
    g.lineTo(backX, backY + boosterLength);
    g.closePath();
    g.endFill();
    container.addChild(g);
}

function renderCircle(object, container) {
    if (object.sprite) {
        drawSprite(object, object.radius * 2 * CONSTANTS.SCALE, object.radius * 2 * CONSTANTS.SCALE, container);
    } else {
        let g = new PIXI.Graphics();
        g.beginFill(string2hex(object.color));
        g.drawCircle(0, 0, object.radius * CONSTANTS.SCALE);
        g.endFill();
        container.addChild(g);
    }
}

function renderRectangle(object, container) {
    if (object.sprite) {
        drawSprite(object, object.width * 2 * CONSTANTS.SCALE, object.height * 2 * CONSTANTS.SCALE, container);
    } else {
        let g = new PIXI.Graphics();
        g.beginFill(string2hex(object.color));
        g.drawRect(
            -object.width * CONSTANTS.SCALE,
            -object.height * CONSTANTS.SCALE,
            object.width * CONSTANTS.SCALE * 2,
            object.height * CONSTANTS.SCALE * 2
        );
        g.endFill();
        container.addChild(g);
    }
}

function drawSprite(object, width, height, container) {
    if (!spriteCache[object.sprite]) {
        spriteCache[object.sprite] = PIXI.Texture.from(`assets/${object.sprite}.png`);
    }
    let sprite = new PIXI.Sprite(spriteCache[object.sprite]);
    sprite.anchor.set(0.5);
    sprite.width = width;
    sprite.height = height;
    container.addChild(sprite);
}

function step(deltaTime) {
    // Apply the camera transformation to the world container
    camera.applyTransform(worldContainer);

    renderWorld();

    // (Optional) Identify our car (used by the camera in Renderer.animate)
    let ourCar;
    for (let id in objects) {
        const obj = objects[id];
        if (obj.socketId == ourId) {
            ourCar = obj;
        }
    }
}

//
// The Renderer class
//
class Renderer {
    constructor() {
        this.currentServerState = {};
        this.previousServerState = {};
        this.lastServerUpdateTime = 0;
        this.updateInterval = 1000 / 60;
        this.lastFrameTime = performance.now();
        this.FPS = 0;
        this.lastFPSUpdate = 0;
        this.lastServerFPSUpdate = 0;

        // Create an FPS text overlay
        this.fpsText = new PIXI.Text('FPS: 0', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0x000000
        });
        uiContainer.addChild(this.fpsText);

        this.animate = this.animate.bind(this);
        app.ticker.add(this.animate);
    }

    receiveServerState(newServerState, serverTimestamp) {
        this.previousServerState = { ...this.currentServerState };

        for (let id in newServerState) {
            this.currentServerState[id] = {
                ...newServerState[id],
                interpolate: newServerState[id].interpolate !== undefined ? newServerState[id].interpolate : true
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
        this.smoothedInterval = this.smoothedInterval !== undefined
            ? (this.smoothedInterval * (1 - smoothingFactor)) + (newInterval * smoothingFactor)
            : newInterval;
        return this.smoothedInterval;
    }

    interpolateObject(object, prevState, currState, alpha) {
        if (!prevState || !currState) return;

        if (prevState.position && currState.position) {
            object.position = Vec2(
                prevState.position.x + alpha * (currState.position.x - prevState.position.x),
                prevState.position.y + alpha * (currState.position.y - prevState.position.y)
            );
        }

        if (prevState.angle !== undefined && currState.angle !== undefined) {
            object.angle = prevState.angle + alpha * (currState.angle - prevState.angle);
        }
    }

    animate(deltaTime) {
        const frameTime = performance.now();
        const dt = frameTime - this.lastFrameTime;
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

                // Make the camera follow our car
                if (object.socketId == ourId) {
                    camera.setPosition(object.position);
                    camera.setAngle(-object.angle);
                }
            }
        }

        step(dt);

        if (performance.now() - this.lastFPSUpdate >= 1000) {
            this.FPS = 1000 / dt;
            this.lastFPSUpdate = performance.now();
        }

        // Update FPS text (positioned in the top left of the UI layer)
        this.fpsText.text = `FPS: ${Math.round(this.FPS)}`;
        this.fpsText.x = 10;
        this.fpsText.y = 10;
    }
}