import { Client, GatewayIntentBits } from 'discord.js';
import { MongoClient } from "mongodb";

export const db = new MongoClient(process.env.MONGO_URL!);

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ]
});
