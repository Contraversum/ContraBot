import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { MongoClient } from "mongodb";

export interface ClientWithCommands extends Client {
    commands: Collection<string, any>
}

export const db = new MongoClient(process.env.MONGO_URL!);

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ]
}) as ClientWithCommands;

client.commands = new Collection();
