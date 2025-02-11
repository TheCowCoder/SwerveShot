import Bot from "./Bot.js";

export default class BotManager {
    constructor(matchMaker) {
        this.matchMaker = matchMaker;
        this.bots = {};


        this.updateRate = 1000 * 5;

        this.queueRunning = true;
        this.botQueueTimeout = this.botQueueInterval.bind(this);

        this.botJoinDelay = 1000 * 5;

        this.queueIntervals = {};

    }

    makeBot(game, io, id, skillLevel) {
        let bot = new Bot(game, io, id, skillLevel);
        this.bots[bot.id] = bot;
        return bot;
    }

    stopQueueInterval() {
        this.queueRunning = false;
    }

    botQueueInterval() {
        console.log("Addding in bots");
        if (!this.queueRunning) return;
        for (let id in this.matchMaker.queue) {
            console.log("Players needed", this.matchMaker.queue[id].playersNeeded);
            if (this.matchMaker.queue[id].playersNeeded - this.matchMaker.queue[id].botsWaiting > 0) {
                console.log("Adding one bot to game", id);
                this.matchMaker.queue[id].botsWaiting++;

                setTimeout(() => {
                    if (!this.matchMaker.queue[id]) {
                        console.log("No longer players needed, bot removed from q");
                        return;
                    };
                    this.matchMaker.queue[id].botsWaiting--;
                    let botId = Math.random().toString();
                    this.matchMaker.addToQueue(botId, this.matchMaker.queue[id].gameMode);

                    console.log("Bot entered queue")
                }, this.botJoinDelay);
            }
        }

        setTimeout(this.botQueueTimeout, this.updateRate);
    }
}