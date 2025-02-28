import Camera3D from './Camera3D.js';
import { io } from "socket.io-client";
import * as PIXI from 'pixi.js';
import "./index.css";
import * as CONSTANTS from "../shared/CONSTANTS.js";
import * as PIXI3D from "pixi3d/pixi7";
import Vec3 from "./Vec3.js";
import * as HELPERS from "../shared/HELPERS.js";

let Vec2 = HELPERS.Vec2;


// Global variables
let debugDot;
let exittingPointerLock = false;
let objects = {};
let wallVertices;


let camera;
let app;
let uiContainer;
let worldContainer;

const spriteCache = {};



async function loadAssets() {
    try {
        // Load all assets as an array
        const assets = await PIXI.Assets.load([
            "/assets/ball.png",
            "/assets/botOne.png",
            "/assets/botTwo.png",
            "/assets/carBlue.png",
            "/assets/carRed.png"
        ]);

        console.log("Assets loaded successfully!");

        // Manually assign textures to a spriteCache with custom keys
        spriteCache["ball"] = PIXI.Assets.get("/assets/ball.png");
        spriteCache["botOne"] = PIXI.Assets.get("/assets/botOne.png");
        spriteCache["botTwo"] = PIXI.Assets.get("/assets/botTwo.png");
        spriteCache["carBlue"] = PIXI.Assets.get("/assets/carBlue.png");
        spriteCache["carRed"] = PIXI.Assets.get("/assets/carRed.png");

    } catch (error) {
        console.error("Error loading assets:", error);
    }
}


let fieldContainer;
let fieldTexture;

async function setupPixi() {

    const gameCanvas = document.getElementById('gameCanvas');
    if (!(gameCanvas instanceof HTMLCanvasElement)) {
        return console.error("The #gameCanvas element is not a canvas!");
    }

    app = new PIXI.Application({
        view: gameCanvas,
        resizeTo: window,
        backgroundColor: 0x3a9f58,
        antialias: true,
    });

    app.stage.sortableChildren = true;


    fieldContainer = new PIXI.Container();
    // app.stage.addChild(fieldContainer);


    // let fieldWidth = CONSTANTS.FIELD_WIDTH * CONSTANTS.SCALE;
    // let fieldHeight = CONSTANTS.FIELD_HEIGHT * CONSTANTS.SCALE;

    // fieldTexture = PIXI.RenderTexture.create({
    //     width: fieldWidth,
    //     height: fieldHeight
    // });

    // let fieldSprite = new PIXI3D.Sprite3D();
    // fieldSprite.texture = fieldTexture;
    // fieldSprite.position.set(0, 0, 0); // Try commenting this
    // app.stage.addChild(fieldSprite);




    await loadAssets();


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
    // camera = new Camera(CONSTANTS.SCALE, app);


    // Load a sprite (e.g., a sample image)
    // const sprite = PIXI.Sprite.from('https://pixijs.io/examples/examples/assets/bunny.png');
    // sprite.x = app.screen.width / 2;
    // sprite.y = app.screen.height / 2;
    // sprite.anchor.set(0.5);
    // app.stage.addChild(sprite);


    // Create a container for all world objects so that the camera transform can be applied
    worldContainer = new PIXI.Container();
    // camera.container.addChild(worldContainer);

    // Create a separate container for UI overlays (like FPS text) that should not be transformed by the camera
    uiContainer = new PIXI.Container();
    // camera.container.addChild(uiContainer);

    app.view.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === app.view && !exittingPointerLock) {
            socket.emit("mousemove", event.movementX, event.movementY, app.view.width, app.view.height);
        }

        // if (camera3D) {
        //     console.log(getCameraEulerAngles(), camera3D.position.x, camera3D.position.y, camera3D.position.z);
        // }
    });

    app.view.addEventListener("mousedown", (e) => {
        socket.emit("mousedown", e.button);
    });

    app.view.addEventListener("mouseup", (e) => {
        socket.emit("mouseup", e.button);
    });

    app.view.addEventListener("wheel", (e) => {
        cameraDistance += e.deltaY * 0.025;
        // camera.setScale(camera.scale + e.deltaY * 0.00025);
        // customScale = true;
        // scaleBtn.style.display = null;
        // e.preventDefault();
    });
}


window.onload = () => {
    setupPixi();
};

// #region Socket events

console.log("Attempting socket connection");
let socket = io({ reconnection: false });
// const socket = io("http://localhost:3000", { reconnection: false });



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

let ourCar;

let objectHeight = 0.01
socket.on("objects added", (_objects) => {
    for (let id in _objects) {
        let object = _objects[id];
        if (object.position) object.position = Vec2(object.position);

        if (object.sprite) {
            object.sprite3D = new PIXI3D.Sprite3D();

            const texture = PIXI.Texture.from(`/assets/${object.sprite}.png`);

            object.sprite3D.texture = texture;

            object.sprite3D.position.set(0, 0, 0);
            object.sprite3D.rotationQuaternion.setEulerAngles(-90, 0, 0);
            object.sprite3D.pixelsPerUnit = CONSTANTS.SCALE;

            if (object.name == "car" || object.name == "ball") {
                object.sprite3D.position.y = objectHeight;
            }
            if (object.socketId == ourId) {
                ourCar = object;
            }
            function applyScale() {
                const textureWidth = texture.width / CONSTANTS.SCALE;
                const textureHeight = texture.height / CONSTANTS.SCALE;

                let scaleX = 1, scaleY = 1;

                if (object.width && object.height) {
                    scaleX = object.width / textureWidth;
                    scaleY = object.height / textureHeight;
                } else if (object.radius) {
                    const diameter = object.radius * 2;
                    scaleX = scaleY = diameter / Math.max(textureWidth, textureHeight);
                }
                object.sprite3D.scale.set(scaleX, scaleY, 1);

            }

            if (texture.baseTexture.valid) {
                applyScale();
            } else {
                texture.baseTexture.once('loaded', applyScale);
            }

            app.stage.addChild(object.sprite3D);
        }

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
        // camera.setScale(1);
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
    // camera.setScale(camera.scale + e.deltaY * 0.00025);
    // customScale = true;
    // scaleBtn.style.display = null;
    // e.preventDefault();
});

// #endregion

// #region UI Control


let tiltSlider = document.getElementById("tiltSlider");



let cameraEuler;


tiltSlider.addEventListener("input", (e) => {
    let newAngle = -90 - parseInt(tiltSlider.value);
    cameraEuler.x = newAngle;

    camera3D.rotationQuaternion.setEulerAngles(cameraEuler.x, cameraEuler.y, cameraEuler.z);
});



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
    // camera.setScale(1);

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
                socket.emit("bot skill", skillLevel);
            }

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

    // Reattach the event listener to the private button
    document.getElementById("privateBtn").addEventListener("click", () => {
        privateBtn.click();
    });
}


let renderer;




// #endregion


// #region Rendering

function renderField() {
    fieldContainer.removeChildren();

    // Field dimensions and screen offsets
    const offsetX = app.renderer.width / 2;
    const offsetY = app.renderer.height / 2;


    renderFieldLines(offsetX, offsetY);
    renderWalls(offsetX, offsetY);
    // renderObjects(offsetX, offsetY);

    // Draw debug dot if set (using red fill)
    // if (debugDot) {
    //     let g = new PIXI.Graphics();
    //     g.beginFill(0xff0000);
    //     g.drawCircle(debugDot.x, debugDot.y, 10);
    //     g.endFill();
    //     worldContainer.addChild(g);
    // }

    // Draw the mouse position dot for our object
    if (mousePos && ourCar) {
        let g = new PIXI.Graphics();
        g.beginFill(0x4bff3b); // equivalent to "#4bff3b"
        const x = mousePos.x + (app.renderer.width / 2) + (ourCar.position.x * CONSTANTS.SCALE);
        const y = mousePos.y + (app.renderer.height / 2) + (ourCar.position.y * CONSTANTS.SCALE);
        g.drawCircle(x, y, 7.5);
        g.endFill();
        fieldContainer.addChild(g);
    }
    app.renderer.render(fieldContainer, { renderTexture: fieldTexture });
}
function renderFieldLines(offsetX, offsetY) {
    let g = new PIXI.Graphics();
    const lineWidth = 5;

    // Center Line
    g.lineStyle(lineWidth, 0x000000);
    g.moveTo(offsetX, offsetY - (CONSTANTS.FIELD_HEIGHT / 2 * CONSTANTS.SCALE));
    g.lineTo(offsetX, offsetY + (CONSTANTS.FIELD_HEIGHT / 2 * CONSTANTS.SCALE));

    // Goal Area Lines (Right Goal)
    let rightGoal = [
        { x: CONSTANTS.FIELD_WIDTH / 2, y: -CONSTANTS.GOAL_SIZE / 2 },
        { x: CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, y: -CONSTANTS.GOAL_SIZE / 2 },
        { x: CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, y: CONSTANTS.GOAL_SIZE / 2 },
        { x: CONSTANTS.FIELD_WIDTH / 2, y: CONSTANTS.GOAL_SIZE / 2 }
    ];

    // Left Goal
    let leftGoal = [
        { x: -CONSTANTS.FIELD_WIDTH / 2, y: CONSTANTS.GOAL_SIZE / 2 },
        { x: -CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, y: CONSTANTS.GOAL_SIZE / 2 },
        { x: -CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, y: -CONSTANTS.GOAL_SIZE / 2 },
        { x: -CONSTANTS.FIELD_WIDTH / 2, y: -CONSTANTS.GOAL_SIZE / 2 }
    ];

    // Draw right goal line
    g.lineStyle(lineWidth, 0x000000);
    g.moveTo(offsetX + rightGoal[0].x * CONSTANTS.SCALE, offsetY + rightGoal[0].y * CONSTANTS.SCALE);
    g.lineTo(offsetX + rightGoal[3].x * CONSTANTS.SCALE, offsetY + rightGoal[3].y * CONSTANTS.SCALE);

    // Draw left goal line
    g.lineStyle(lineWidth, 0x000000);
    g.moveTo(offsetX + leftGoal[0].x * CONSTANTS.SCALE, offsetY + leftGoal[0].y * CONSTANTS.SCALE);
    g.lineTo(offsetX + leftGoal[3].x * CONSTANTS.SCALE, offsetY + leftGoal[3].y * CONSTANTS.SCALE);

    // Draw the center circle
    g.lineStyle(lineWidth, 0x000000);
    g.drawCircle(offsetX, offsetY, 7.5 * CONSTANTS.SCALE);

    // Draw the center dot
    g.beginFill(0x000000);
    g.drawCircle(offsetX, offsetY, CONSTANTS.BALL_RADIUS * CONSTANTS.SCALE);
    g.endFill();

    // Add the graphics to the world container
    fieldContainer.addChild(g);
}

function renderWalls(offsetX, offsetY) {
    if (!wallVertices || wallVertices.length < 3) return;

    let g = new PIXI.Graphics();
    const lineWidth = 20;
    const offsetAmount = (-lineWidth / 2) / CONSTANTS.SCALE;

    g.clear();
    g.lineStyle(lineWidth, 0x004404);

    let offsetVertices = [];

    for (let i = 0; i < wallVertices.length; i++) {
        const curr = wallVertices[i];
        const next = wallVertices[(i + 1) % wallVertices.length];

        // Edge vector and perpendicular normal
        const edge = next.clone().sub(curr);
        const edgeNormal = Vec2(-edge.y, edge.x).normalize();

        const prev = wallVertices[(i - 1 + wallVertices.length) % wallVertices.length];
        const prevEdge = curr.clone().sub(prev);
        const prevEdgeNormal = Vec2(-prevEdge.y, prevEdge.x).normalize();

        // Average normals for smoother offset
        const avgNormal = prevEdgeNormal.add(edgeNormal).normalize();
        offsetVertices.push(curr.clone().add(avgNormal.mul(offsetAmount)));
    }

    // Draw wall polygon
    g.moveTo(offsetX + offsetVertices[0].x * CONSTANTS.SCALE, offsetY + offsetVertices[0].y * CONSTANTS.SCALE);
    for (let i = 1; i < offsetVertices.length; i++) {
        g.lineTo(offsetX + offsetVertices[i].x * CONSTANTS.SCALE, offsetY + offsetVertices[i].y * CONSTANTS.SCALE);
    }
    g.lineTo(offsetX + offsetVertices[0].x * CONSTANTS.SCALE, offsetY + offsetVertices[0].y * CONSTANTS.SCALE);

    fieldContainer.addChild(g);
}


function renderObjects(offsetX, offsetY) {
    for (let id in objects) {
        // console.log('rendering', id);
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

        fieldContainer.addChild(objContainer);
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
        // console.log("drawwing", object.sprite);
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
        spriteCache[object.sprite] = PIXI.Assets.get(object.sprite);
    }

    if (!spriteCache[object.sprite]) {
        return console.error(`Texture for ${object.sprite} not found!`);
    }

    let sprite = new PIXI.Sprite(spriteCache[object.sprite]);
    sprite.anchor.set(0.5);
    sprite.width = width;
    sprite.height = height;
    container.addChild(sprite);
}


let camera3D;




function getCameraEulerAngles() {
    let q = camera3D.rotationQuaternion;

    // Convert quaternion to Euler angles (in radians)
    let x = Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y));
    let y = Math.asin(2 * (q.w * q.y - q.z * q.x));
    let z = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));

    // Convert radians to degrees
    return {
        x: HELPERS.radToDeg(x),
        y: HELPERS.radToDeg(y),
        z: HELPERS.radToDeg(z)
    };
}



function setupField() {
    if (ourCar) {
        camera3D = new Camera3D(PIXI3D.Camera.main, ourCar.sprite3D);
    } else {
        console.log("No ourCar in setupField");
    }


    // let control = new PIXI3D.CameraOrbitControl(app.view)


    let bounds = fieldContainer.getLocalBounds();
    let fieldWidth = bounds.width;
    let fieldHeight = bounds.height;
    fieldContainer.position.set(-bounds.x, -bounds.y);

    fieldTexture = PIXI.RenderTexture.create({
        width: fieldWidth,
        height: fieldHeight
    });

    fieldWidth /= CONSTANTS.SCALE;
    fieldHeight /= CONSTANTS.SCALE;


    const fieldPlane = PIXI3D.Mesh3D.createPlane();
    fieldPlane.material.baseColorTexture = fieldTexture;
    fieldPlane.position.set(0, 0, 0);
    fieldPlane.scale.set(1, 1, 2.5);
    // fieldPlane.pixelsPerUnit = CONSTANTS.SCALE;
    fieldPlane.scale.set(Math.round(fieldWidth / 2), 1, Math.round(fieldHeight / 2));
    // fieldPlane.rotationQuaternion.setEulerAngles(0, 0, 0);
    fieldPlane.material.unlit = true;
    app.stage.addChild(fieldPlane);
}

let fieldSetup = false;


let cameraDistance = 25;
let cameraUpOffset = 7.5;

function step(deltaTime) {
    renderField();

    // Update all sprite3d positions to match object positions
    for (let id in objects) {
        let object = objects[id];
        if (object.sprite3D) {
            object.sprite3D.position.set(object.position.x, objectHeight, object.position.y);
            object.sprite3D.rotationQuaternion.setEulerAngles(-90, HELPERS.radToDeg(-object.angle), 0);
        }
    }

    if (!fieldSetup && ourCar) {
        setupField();
        fieldSetup = true;
    }
    if (ourCar) {
        camera3D.update();
        // let cameraTiltAngle = HELPERS.degToRad(cameraEuler.x + 180);

        // let yOffset = cameraDistance * Math.sin(cameraTiltAngle);
        // let zOffset = cameraDistance * Math.cos(cameraTiltAngle);

        // let cameraDest = new Vec3(ourCar.position.x, 0, ourCar.position.y);

        // let carForward = new Vec3(Math.sin(ourCar.angle), 0, -Math.cos(ourCar.angle));

        // cameraDest.sub(carForward.mul(zOffset));
        // cameraDest.add(new Vec3(0, yOffset, 0));


        // const matrix = camera3D.worldTransform;

        // let downVector = new Vec3(matrix.down.x, matrix.down.y, matrix.down.z);

        // cameraDest.sub(downVector.mul(cameraUpOffset));

        // camera3D.position.set(cameraDest.x, cameraDest.y, cameraDest.z);

        // cameraEuler.y = HELPERS.radToDeg(ourCar.angle);
        // camera3D.rotationQuaternion.setEulerAngles(cameraEuler.x, cameraEuler.y, cameraEuler.z);
    }
}


class Renderer {
    constructor() {
        this.currentServerState = {};
        this.previousServerState = {};
        // Timestamps for server updates:
        this.lastServerUpdateTime = 0;
        this.previousServerUpdateTime = 0;
        // Default update interval (ms)
        this.updateInterval = 1000 / 60;
        this.lastFrameTime = performance.now();
        this.FPS = 0;
        this.lastFPSUpdate = 0;
        this.lastServerFPSUpdate = 0;

        // Create an FPS text overlay
        this.fpsText = new PIXI.Text("FPS: 0", {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0x000000
        });

        uiContainer.addChild(this.fpsText);

        this.animate = this.animate.bind(this);
        app.ticker.add(this.animate);
    }

    receiveServerState(newServerState, serverTimestamp) {
        // Save the current state as the previous state (shallow copy)
        this.previousServerState = { ...this.currentServerState };

        // Update the current state with the new data
        for (let id in newServerState) {
            this.currentServerState[id] = {
                ...newServerState[id],
                interpolate: newServerState[id].interpolate !== undefined ? newServerState[id].interpolate : true
            };
        }

        let clientTime = performance.now();
        let networkLatency = clientTime - serverTimestamp;
        let adjustedServerTime = serverTimestamp + networkLatency / 2;

        // If we already have a previous timestamp, update it:
        if (this.lastServerUpdateTime) {
            this.previousServerUpdateTime = this.lastServerUpdateTime;
            const newUpdateInterval = adjustedServerTime - this.lastServerUpdateTime;
            this.updateInterval = this.smoothUpdateInterval(newUpdateInterval);
        } else {
            // For the very first update, initialize both timestamps to adjustedServerTime
            this.previousServerUpdateTime = adjustedServerTime;
        }

        // Set the new current update time
        this.lastServerUpdateTime = adjustedServerTime;

        if (performance.now() - this.lastServerFPSUpdate >= 5000) {
            console.log("Server FPS:", (1000 / this.updateInterval).toFixed(2));
            this.lastServerFPSUpdate = performance.now();
        }
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
        const now = performance.now();
        const dt = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Calculate the time interval between the last two server updates
        const interval = this.lastServerUpdateTime - this.previousServerUpdateTime;
        // Compute α based on time since the previous update
        let alpha = interval > 0 ? (now - this.previousServerUpdateTime) / interval : 1;
        // Clamp α between 0 and 1
        alpha = Math.max(0, Math.min(alpha, 1));

        // Interpolate each object's state
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

                // (Optional) Make the camera follow our car
                // if (object.socketId == ourId) {
                //     // camera logic...
                //     camera.setPosition(object.position);
                //     camera.setAngle(-object.angle);
                //     camera.applyTransform();
                // }
            }
        }

        step(dt);

        if (now - this.lastFPSUpdate >= 1000) {
            this.FPS = 1000 / dt;
            this.lastFPSUpdate = now;
        }

        // Update FPS text (positioned in the top left of the UI layer)
        this.fpsText.text = `FPS: ${Math.round(this.FPS)}`;
        this.fpsText.x = 10;
        this.fpsText.y = 10;
    }
}

// #endregion