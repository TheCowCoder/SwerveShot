import Bot from "./Bot.js";

export default class BotManager {
    constructor() {
        this.bots = {};
    }

    makeBot(game, io) {
        let bot = new Bot(game, io);

        this.bots[bot.id] = bot;
        return bot;
    }
}