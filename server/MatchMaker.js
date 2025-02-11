import Game from "./Game.js";
import Bot from "./Bot.js";

function chooseRandom(array) {
    let randomIndex = Math.floor(Math.random() * array.length);
    let choice = array.splice(randomIndex, 1)[0];
    return [choice, array];
}


export default class MatchMaker {
    constructor(players, botManager, io) {
        this.queue = {};
        this.players = players;
        this.botManager = botManager;
        this.io = io;
        this.matchStartDelay = 1000 * 5;

    }

    addToQueue(id, gameMode) {
        this.queue[id] = {
            gameMode,
            avgMMR: this.players[id] !== undefined ? this.players[id].MMR : 0,
            players: [id]
        }

        if (gameMode == "1v1") {
            this.queue[id].playersNeeded = 1;
        } else if (gameMode == "2v2") {
            this.queue[id].playersNeeded = 3;
        } else if (gameMode == "3v3") {
            this.queue[id].playersNeeded = 5;
        }

        this.matchMake();
    }

    removeFromQueue(id) {
        // Remove player's own searching group if they were the creator
        if (this.queue[id]) {
            let removedGroup = this.queue[id];
            delete this.queue[id];

            // Create new searching groups for remaining players
            removedGroup.players.forEach(playerId => {
                if (playerId !== id) {
                    this.queue[playerId] = {
                        gameMode: removedGroup.gameMode,
                        avgMMR: this.players[playerId] !== undefined ? this.players[playerId].MMR : 0,
                        players: [playerId],
                        playersNeeded: removedGroup.gameMode === "1v1" ? 1 :
                            removedGroup.gameMode === "2v2" ? 3 : 5
                    };
                }
            });
        }

        // Search for and remove the player from any other searching groups
        for (let creatorId in this.queue) {
            let searchingGroup = this.queue[creatorId];

            let index = searchingGroup.players.indexOf(id);
            if (index !== -1) {
                searchingGroup.players.splice(index, 1);
                searchingGroup.playersNeeded += 1;

                if (searchingGroup.players.length > 0) {
                    // Update avgMMR after removing player
                    let sumMMR = searchingGroup.players.reduce((sum, playerId) => sum + (this.players[playerId] !== undefined ? this.players[playerId].MMR : 0), 0);
                    searchingGroup.avgMMR = sumMMR / searchingGroup.players.length;
                } else {
                    // No players left, remove group
                    delete this.queue[creatorId];
                }
            }
        }


    }


    matchMake() {
        console.log("Matchmaking...");
        let MMR_THRESHOLD = 100;
    
        for (let creatorId in this.queue) {
            let searchingGroup = this.queue[creatorId];

            for (let otherCreatorId in this.queue) {
                let otherSearchingGroup = this.queue[otherCreatorId];
                if (otherSearchingGroup === searchingGroup) continue;

                if (searchingGroup.gameMode === otherSearchingGroup.gameMode) {
                    if (Math.abs(searchingGroup.avgMMR - otherSearchingGroup.avgMMR) < MMR_THRESHOLD) {
                        if (searchingGroup.playersNeeded >= otherSearchingGroup.players.length) {
                            let oldCount = searchingGroup.players.length;
                            let newCount = otherSearchingGroup.players.length;
                            let totalCount = oldCount + newCount;

                            let sumNewMMR = otherSearchingGroup.players.reduce(
                                (sum, playerId) => sum + (this.players[playerId] !== undefined ? this.players[playerId].MMR : 0), 0
                            );

                            // Update avgMMR using running average formula
                            searchingGroup.avgMMR =
                                (searchingGroup.avgMMR * oldCount + sumNewMMR) / totalCount;

                            // Merge players
                            searchingGroup.players = searchingGroup.players.concat(otherSearchingGroup.players);
                            searchingGroup.playersNeeded -= otherSearchingGroup.players.length;

                            // Remove merged group from queue
                            delete this.queue[otherCreatorId];

                            if (searchingGroup.playersNeeded === 0) {
                                this.matchMade(searchingGroup.players, searchingGroup.gameMode);
                                delete this.queue[creatorId];
                            } else {
                                console.log("Combined with another searchingGroup");
                            }
                        }
                    }
                }
            }
        }

    }

    matchMade(_players, gameMode) {
        console.log("Match made!", gameMode, _players);

        let game = new Game(this.io, this.botManager, false);

        
        for (let id of _players) {
            const player = this.players[id];
        
            if (player) {
                game.playerJoined(player.socket);
                player.game = game;
            }
        }

        for (let id of _players) {
            const player = this.players[id];
        
            if (!player) {
                let botSkill = Math.pow(Math.random(), 0.5); // Adjust exponent to control bias strength
                let bot = this.botManager.makeBot(game, this.io, id, botSkill);
            }
        }
        

        this.io.to(game.id).emit("match made");


        if (gameMode == "1v1") {
            let p1;
            [p1, _players] = chooseRandom(_players);
            let p2;
            [p2, _players] = chooseRandom(_players);
            
            game.players[p1].team = "blue";
            game.players[p2].team = "red";


            this.io.to(game.id).emit("object updates", {
                [game.players[p1].car.id]: { sprite: game.players[p1].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p2].car.id]: { sprite: game.players[p2].team === "blue" ? "carBlue" : "carRed" }
            });

            setTimeout(() => {
                game.start(true);
            }, this.matchStartDelay);

        } else if (gameMode == "2v2") {
            let p1;
            [p1, _players] = chooseRandom(_players);
            let p2;
            [p2, _players] = chooseRandom(_players);

            let p3;
            [p3, _players] = chooseRandom(_players);
            let p4;
            [p4, _players] = chooseRandom(_players);

            game.players[p1].team = "blue";
            game.players[p2].team = "blue";
            game.players[p3].team = "red";
            game.players[p4].team = "red";

            this.io.to(game.id).emit("object updates", {
                [game.players[p1].car.id]: { sprite: game.players[p1].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p2].car.id]: { sprite: game.players[p2].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p3].car.id]: { sprite: game.players[p3].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p4].car.id]: { sprite: game.players[p4].team === "blue" ? "carBlue" : "carRed" }
            });

            setTimeout(() => {
                game.start(true);
            }, this.matchStartDelay);


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


            game.players[p1].team = "blue";
            game.players[p2].team = "blue";
            game.players[p3].team = "blue";

            game.players[p4].team = "red";
            game.players[p5].team = "red";
            game.players[p6].team = "red";

            this.io.to(game.id).emit("object updates", {
                [game.players[p1].car.id]: { sprite: game.players[p1].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p2].car.id]: { sprite: game.players[p2].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p3].car.id]: { sprite: game.players[p3].team === "blue" ? "carBlue" : "carRed" },

                [game.players[p4].car.id]: { sprite: game.players[p4].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p5].car.id]: { sprite: game.players[p5].team === "blue" ? "carBlue" : "carRed" },
                [game.players[p6].car.id]: { sprite: game.players[p6].team === "blue" ? "carBlue" : "carRed" },
            });

            setTimeout(() => {
                game.start(true);
            }, this.matchStartDelay);

        }
    }
}