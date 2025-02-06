import express from "express"; // Importing express
import http from "http"; // Importing http module
import { readdir } from 'fs/promises';
import { Server } from "socket.io"; // Importing Server from socket.io
import { fileURLToPath } from "url";
import path from "path"; // Importing path module

import pl, { Vec2 } from "planck-js"; // Importing planck-js
import Game from "./Game.js";
import * as CONSTANTS from "../shared/CONSTANTS.js";


const PORT = process.env.PORT || 3000;

const app = express();
const __filename = fileURLToPath(import.meta.url); // Get the current filename
const __dirname = path.dirname(__filename); // Get the directory name
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static("public"));

app.use("/shared", express.static(path.join(__dirname, "../shared")));

let players = {};

let queue = {};

let matchStartDelay = 1000 * 5;

function matchmake() {
    let MMR_THRESHOLD = 100;

    for (let creatorId in queue) {
        let searchingGroup = queue[creatorId];

        for (let otherCreatorId in queue) {
            let otherSearchingGroup = queue[otherCreatorId];
            if (otherSearchingGroup === searchingGroup) continue;

            if (searchingGroup.gameMode === otherSearchingGroup.gameMode) {
                if (Math.abs(searchingGroup.avgMMR - otherSearchingGroup.avgMMR) < MMR_THRESHOLD) {
                    if (searchingGroup.playersNeeded >= otherSearchingGroup.players.length) {
                        let oldCount = searchingGroup.players.length;
                        let newCount = otherSearchingGroup.players.length;
                        let totalCount = oldCount + newCount;

                        let sumNewMMR = otherSearchingGroup.players.reduce(
                            (sum, playerId) => sum + players[playerId].MMR, 0
                        );

                        // Update avgMMR using running average formula
                        searchingGroup.avgMMR =
                            (searchingGroup.avgMMR * oldCount + sumNewMMR) / totalCount;

                        // Merge players
                        searchingGroup.players = searchingGroup.players.concat(otherSearchingGroup.players);
                        searchingGroup.playersNeeded -= otherSearchingGroup.players.length;

                        // Remove merged group from queue
                        delete queue[otherCreatorId];

                        if (searchingGroup.playersNeeded === 0) {
                            console.log("Match made!", searchingGroup.players);
                            matchMade(searchingGroup.players, searchingGroup.gameMode);
                            // Remove the group from queue since match is made
                            delete queue[creatorId];
                        } else {
                            console.log("Combined with another searchingGroup");
                        }
                    }
                }
            }
        }
    }
}


function chooseRandom(array) {
    let randomIndex = Math.floor(Math.random() * array.length);
    let choice = array.splice(randomIndex, 1)[0];
    return [choice, array];
}
function matchMade(_players, gameMode) {
    let game = new Game(io, false);

    for (let id of _players) {
        const player = players[id];
        game.playerJoined(player.socket);
        player.game = game;
    }

    io.to(game.id).emit("match made");

    if (gameMode == "1v1") {
        let p1;
        [p1, _players] = chooseRandom(_players);
        let p2;
        [p2, _players] = chooseRandom(_players);

        game.players[p1].team = "left";
        game.players[p2].team = "right";

        io.to(game.id).emit("object updates", {
            [game.players[p1].car.id]: { sprite: game.players[p1].team === "left" ? "carBlue" : "carRed" },
            [game.players[p2].car.id]: { sprite: game.players[p2].team === "left" ? "carBlue" : "carRed" }
        });

        setTimeout(() => {
            game.start(true);
        }, matchStartDelay);

    } else if (gameMode == "2v2") {
        let p1;
        [p1, _players] = chooseRandom(_players);
        let p2;
        [p2, _players] = chooseRandom(_players);

        let p3;
        [p3, _players] = chooseRandom(_players);
        let p4;
        [p4, _players] = chooseRandom(_players);

        game.players[p1].team = "left";
        game.players[p2].team = "left";
        game.players[p3].team = "right";
        game.players[p4].team = "right";

        io.to(game.id).emit("object updates", {
            [game.players[p1].car.id]: { sprite: game.players[p1].team === "left" ? "carBlue" : "carRed" },
            [game.players[p2].car.id]: { sprite: game.players[p2].team === "left" ? "carBlue" : "carRed" },
            [game.players[p3].car.id]: { sprite: game.players[p3].team === "left" ? "carBlue" : "carRed" },
            [game.players[p4].car.id]: { sprite: game.players[p4].team === "left" ? "carBlue" : "carRed" }
        });

        setTimeout(() => {
            game.start(true);
        }, matchStartDelay);


    } else if (gameMode == "3v3") {
        let p1;
        [p1, _players] = chooseRandom(_players);
        let p2;
        [p2, _players] = chooseRandom(_players);
        let p3;
        [p3, _players] = chooseRandom(_players);

        let p4;
        [p4, _players] = chooseRandom(_players);
        let p5;
        [p5, _players] = chooseRandom(_players);
        let p6;
        [p6, _players] = chooseRandom(_players);


        game.players[p1].team = "left";
        game.players[p2].team = "left";
        game.players[p3].team = "left";

        game.players[p4].team = "right";
        game.players[p5].team = "right";
        game.players[p6].team = "right";

        io.to(game.id).emit("object updates", {
            [game.players[p1].car.id]: { sprite: game.players[p1].team === "left" ? "carBlue" : "carRed" },
            [game.players[p2].car.id]: { sprite: game.players[p2].team === "left" ? "carBlue" : "carRed" },
            [game.players[p3].car.id]: { sprite: game.players[p3].team === "left" ? "carBlue" : "carRed" },

            [game.players[p4].car.id]: { sprite: game.players[p4].team === "left" ? "carBlue" : "carRed" },
            [game.players[p5].car.id]: { sprite: game.players[p5].team === "left" ? "carBlue" : "carRed" },
            [game.players[p6].car.id]: { sprite: game.players[p6].team === "left" ? "carBlue" : "carRed" },
        });

        setTimeout(() => {
            game.start(true);
        }, matchStartDelay);

    }
}

io.on("connection", (socket) => {
    console.log("A user connected!", socket.id);


    players[socket.id] = {
        id: socket.id,
        socket: socket,
        MMR: 0,
        game: null
    }

    socket.emit("your id", socket.id);

    socket.on("time", (remainingSeconds) => {
        if (players[socket.id].game) players[socket.id].game.remainingSeconds = remainingSeconds;
    })

    socket.on("chat", msg => {
        let sender;
        if (players[socket.id].game?.players[socket.id].team == "left") {
            sender = "Blue";
        } else {
            sender = "Red";
        }
        if (players[socket.id].game) io.to(players[socket.id].game.id).emit("chat", sender, msg)
    });
    socket.on("queue", (gameMode) => {
        console.log("QUEUE request, gamemode", gameMode);
        console.log("Queue:", queue);

        queue[socket.id] = {
            gameMode,
            avgMMR: players[socket.id].MMR,
            players: [socket.id]
        }
        if (gameMode == "1v1") {
            queue[socket.id].playersNeeded = 1;
        } else if (gameMode == "2v2") {
            queue[socket.id].playersNeeded = 3;
        } else if (gameMode == "3v3") {
            queue[socket.id].playersNeeded = 5;
        }


        matchmake();

        console.log("After queue:", queue);
    });

    socket.on("settings", (settings, cb) => {
        if (!players[socket.id].game) {
            cb(false);
            return;
        }
        for (let key in settings) {
            players[socket.id].game.players[socket.id].settings[key] = settings[key];
            if (key === "speedMultiplier") {
                players[socket.id].game.setSpeedMultiplier(settings[key]);
            }
        }
        if (typeof cb == "function") cb(true);
    });

    socket.on("exit pointer lock", (cb) => {
        players[socket.id].game.players[socket.id].inputs["mousePos"] = null;
        cb();
    });
    socket.on("start", () => {
        if (players[socket.id].game?.privateMatch) {
            players[socket.id].game.start(true);
        }
    });
    socket.on("end", () => {
        if (players[socket.id].game?.privateMatch) {
            players[socket.id].game.end(true);
        }
    });

    socket.on("team", team => {
        if (!players[socket.id].game?.privateMatch) return;

        if (team === "left" || team === "right") {
            players[socket.id].game.players[socket.id].team = team;
            io.to(players[socket.id].game.id).emit("object updates", { [players[socket.id].game.players[socket.id].car.id]: { sprite: team === "left" ? "carBlue" : "carRed" } });
        }
    });

    socket.on("create game", (cb) => {
        players[socket.id].game = new Game(io, true);
        players[socket.id].game.playerJoined(socket);
        cb(players[socket.id].game.code);
    });

    socket.on("join game", (code, cb) => {

        for (let id in Game.instances) {
            const _game = Game.instances[id];
            if (_game.code === code) {
                _game.playerJoined(socket);
                players[socket.id].game = _game;
            }
        }
        if (players[socket.id].game) {
            cb(players[socket.id].game.code);
        } else {
            cb(false);
        }
    });
    socket.on("mousemove", (x, y, w, h) => {
        if (players[socket.id].game) players[socket.id].game.mouseMove(socket.id, x, y, w, h);

    });
    socket.on("mousedown", (button) => {
        if (players[socket.id].game) players[socket.id].game.mouseDown(socket.id, button);
    });
    socket.on("mouseup", (button) => {
        if (players[socket.id].game) players[socket.id].game.mouseUp(socket.id, button);
    });
    socket.on("keydown", (key) => {
        if (players[socket.id].game) players[socket.id].game.keyDown(socket.id, key);
    });
    socket.on("keyup", (key) => {
        if (players[socket.id].game) players[socket.id].game.keyUp(socket.id, key);
    });


    socket.on("disconnecting", () => {
        console.log(socket.id, "disconnecting");
    });

    function playerLeft(id) {
        if (!players[id].game) return;

        players[id].game.playerLeft(socket);

        let playersLeft = false;
        let playersRight = false;

        for (let _id in players[id].game.players) {
            const player = players[id].game.players[_id];
            if (player.team == "left") {
                playersLeft = true;
            } else if (player.team == "right") {
                playersRight = true;
            }
        }

        if (!playersLeft || !playersRight) {
            players[id].game.end();
        }

        players[id].game = null;
    }

    socket.on("leave game", () => {
        if (players[socket.id].game) playerLeft(socket.id);
    })

    socket.on("disconnect", () => {
        console.log("A user disconnected!", socket.id);

        // Remove player's own searching group if they were the creator
        if (queue[socket.id]) {
            let removedGroup = queue[socket.id];
            delete queue[socket.id];

            // Create new searching groups for remaining players
            removedGroup.players.forEach(playerId => {
                if (playerId !== socket.id) {
                    queue[playerId] = {
                        gameMode: removedGroup.gameMode,
                        avgMMR: players[playerId].MMR,
                        players: [playerId],
                        playersNeeded: removedGroup.gameMode === "1v1" ? 1 :
                            removedGroup.gameMode === "2v2" ? 3 : 5
                    };
                }
            });
        }

        // Search for and remove the player from any other searching groups
        for (let creatorId in queue) {
            let searchingGroup = queue[creatorId];

            let index = searchingGroup.players.indexOf(socket.id);
            if (index !== -1) {
                searchingGroup.players.splice(index, 1);
                searchingGroup.playersNeeded += 1;

                if (searchingGroup.players.length > 0) {
                    // Update avgMMR after removing player
                    let sumMMR = searchingGroup.players.reduce((sum, playerId) => sum + players[playerId].MMR, 0);
                    searchingGroup.avgMMR = sumMMR / searchingGroup.players.length;
                } else {
                    // No players left, remove group
                    delete queue[creatorId];
                }
            }
        }

        // Remove player from the players object

        playerLeft(socket.id);

        delete players[socket.id];

        matchmake();
    });

});


// server.listen(PORT, () => {
//     console.log("Listening on port", PORT);
// });


server.listen(PORT, "0.0.0.0", () => {
    console.log("Listening on port", PORT);
});
