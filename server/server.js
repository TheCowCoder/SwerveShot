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



io.on("connection", (socket) => {
    console.log("A user connected!", socket.id);

    let game;

    socket.emit("your id", socket.id);

    socket.on("settings", settings => {
        for (let key in settings) {
            game.players[socket.id].settings[key] = settings[key];
        }
    });

    socket.on("exit pointer lock", () => {
        game.players[socket.id].inputs["mousePos"] = null;
    });
    socket.on("start", () => {
        if (game) game.start();
    });

    socket.on("team", team => {
        if (!game) return;

        if (team === "left" || team === "right") {
            game.players[socket.id].team = team;
            io.to(game.id).emit("object updates", { [game.players[socket.id].car.id]: { sprite: team === "left" ? "carBlue" : "carRed" } });
        }
    });

    socket.on("create game", () => {
        game = new Game(io);
        game.playerJoined(socket);
        socket.emit("game code", game.code);
    });

    socket.on("join game", code => {
        for (let id in Game.instances) {
            const _game = Game.instances[id];
            if (_game.code === code) {
                _game.playerJoined(socket);
                game = _game;
                socket.emit("game code", game.code);
            }
        }
    });
    socket.on("mousemove", (x, y, w, h) => {
        if (game) game.mouseMove(socket.id, x, y, w, h);

    });
    socket.on("mousedown", (button) => {
        if (game) game.mouseDown(socket.id, button);
    });
    socket.on("mouseup", (button) => {
        if (game) game.mouseUp(socket.id, button);
    });
    socket.on("keydown", (key) => {
        if (game) game.keyDown(socket.id, key);
    });
    socket.on("keyup", (key) => {
        if (game) game.keyUp(socket.id, key);
    });


    socket.on("disconnecting", () => {
        console.log(socket.id, "disconnecting");
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected!", socket.id);
        if (game) game.playerLeft(socket);
    });
});


server.listen(PORT, () => {
    console.log("Listening on port", PORT);
});
