import express from "express"; // Importing express
import http from "http"; // Importing http module
import { readdir } from 'fs/promises';
import { Server } from "socket.io"; // Importing Server from socket.io
import { fileURLToPath } from "url";
import path from "path"; // Importing path module


import pl from "planck-js"; // Importing planck-js
import Game from "./Game.js";
import * as CONSTANTS from "../shared/CONSTANTS.js";
import BotManager from "./BotManager.js";
import MatchMaker from "./MatchMaker.js";
import { copyFileSync } from "fs";
import * as HELPERS from "../shared/HELPERS.js";

let Vec2 = HELPERS.Vec2;


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


const botManager = new BotManager();
const matchMaker = new MatchMaker(players, botManager, io);
botManager.matchMaker = matchMaker;

botManager.botQueueInterval();


io.on("connection", (socket) => {
    console.log("A user connected!", socket.id);


    players[socket.id] = {
        id: socket.id,
        socket: socket,
        MMR: 0,
        game: null
    }


    socket.emit("your id", socket.id);

    socket.on("bot skill", (skillLevel) => {
        if (players[socket.id].game) {
            for (let id in players[socket.id].game.players) {
                if (id in botManager.bots) {
                    botManager.bots[id].skillLevel = skillLevel;
                }
            }
        }
    });
    socket.on("preset", (preset) => {
        if (!players[socket.id].game) return;

        players[socket.id].game.applyPreset(preset);
    });

    socket.on("bot", (team) => {
        let game = players[socket.id].game;
        if (game) {
            let bot = botManager.makeBot(game, io);
            bot.player.team = team;
            io.to(game.id).emit("object updates", {
                [bot.player.car.id]: {
                    team: team,
                    sprite: team == "blue" ? "carBlue" : bot.player.car.sprite
                }
            });
        }
    });

    socket.on("bs", () => {
        let bot = botManager.bots[Object.keys(botManager.bots)[0]];
        bot.step();
    });

    socket.on("time", (remainingSeconds) => {
        if (players[socket.id].game) players[socket.id].game.remainingSeconds = remainingSeconds;
    })

    socket.on("chat", msg => {
        let sender;
        if (players[socket.id].game?.players[socket.id].team == "blue") {
            sender = "Blue";
        } else {
            sender = "Red";
        }
        if (players[socket.id].game) io.to(players[socket.id].game.id).emit("chat", sender, msg)
    });
    socket.on("queue", (gameMode) => {
        matchMaker.addToQueue(socket.id, gameMode);
    });

    socket.on("settings", (settings, cb) => {
        if (!players[socket.id].game) {
            if (typeof cb == "function") cb(false);
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
        console.log(socket.id, "exit pointer lock");
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

        if (team === "blue" || team === "red") {
            players[socket.id].game.players[socket.id].team = team;
            io.to(players[socket.id].game.id).emit("object updates", { [players[socket.id].game.players[socket.id].car.id]: { sprite: team === "blue" ? "carBlue" : "carRed" } });
        }
    });

    socket.on("create game", (cb) => {
        players[socket.id].game = new Game(io, botManager, true);
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
            if (player.team == "blue") {
                playersLeft = true;
            } else if (player.team == "red") {
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

        matchMaker.removeFromQueue(socket.id);

        playerLeft(socket.id);
        delete players[socket.id];
    });

});



server.listen(PORT, "0.0.0.0", () => {
    console.log("Listening on port", PORT);
});
