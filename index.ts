import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { token } from './config.json';
import { sendQuestion } from './commands/test/test-command';
import { sendSurveyQuestions, Feedbackquestions } from './commands/test/startSurvey';
import fs from 'fs'
import path from 'path'
import { MongoClient } from "mongodb";

export const db = new MongoClient("mongodb://localhost:27017/");
interface ClientWithCommands extends Client {
    commands: Collection<string, any>
}
const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.DirectMessages 
    ] 
}) as ClientWithCommands;


client.on(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    await db.connect();
});

client.login(token); // Log in to the bot

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Catch command errors
client.on(Events.InteractionCreate, async (interaction) => {
    // Handle Slash commands
    if (interaction.isChatInputCommand()) {
        const command = (interaction.client as ClientWithCommands).commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true,
                });
            }
        }
    }

    // check if the interaction is a button interaction
    else if (interaction.isButton()) {
        const buttonId = interaction.customId;

        if (buttonId === 'start_survey') {
            await interaction.deferUpdate();
            sendSurveyQuestions(interaction);
    
            // Update context for this user in the database to indicate feedback process has started
            await db.db('contrabot').collection("users").updateOne(
                { userId: interaction.user.id }, 
                { 
                    $set: { 
                        feedbackInProgress: true,
                        currentFeedbackQuestionIndex: 0
                    }
                }, 
                { upsert: true }
            );
        }
        else {
        // Fetch user's context from the database
        const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });
        
        let userResponses = userContext?.userVector || [];
    
        // Update the userResponses based on button clicked
        if (buttonId === 'agree') userResponses.push(1);
        else if (buttonId === 'disagree') userResponses.push(-1);
        else if (buttonId === 'neutral') userResponses.push(0);
    
        // Update the userResponses for this user in the database
        await db.db('contrabot').collection("users").updateOne(
            { userId: interaction.user.id },
            {
                $set: {
                    userVector: userResponses
                }
            }
        );
    
        await interaction.deferUpdate();
        sendQuestion(interaction);
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    try {
        // Fetch user's context from the database
        const userContext = await db.db('contrabot').collection("users").findOne({ userId: message.author.id });

        if (userContext?.feedbackInProgress) {
            // Update feedback question index
            let currentFeedbackQuestionIndex = userContext?.currentFeedbackQuestionIndex || 0;
            currentFeedbackQuestionIndex++;

            // If there are more survey questions, send the next one
            if (currentFeedbackQuestionIndex < Feedbackquestions.length) {
                message.author.send(Feedbackquestions[currentFeedbackQuestionIndex]);

                await db.db('contrabot').collection("users").updateOne(
                    { userId: message.author.id }, 
                    { 
                        $set: { 
                            currentFeedbackQuestionIndex: currentFeedbackQuestionIndex
                        }
                    }
                );
            } else {
                // If no more questions, end the feedback process
                await db.db('contrabot').collection("users").updateOne(
                    { userId: message.author.id }, 
                    { 
                        $set: { 
                            feedbackInProgress: false
                        }
                    }
                );
                message.author.send("Danke für dein Feedback und dein Beitrag zur Verbesserung des Bots!");
            }
        }
    } catch (error) {
        console.error("Error in Events.MessageCreate:", error);
    }
});


export { client };