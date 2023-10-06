import 'dotenv/config'
import { Events } from 'discord.js';
import { sendQuestion, sendTestButton, specificQuestionMessage } from './commands/test/test-command';
import { sendSurveyQuestions, Feedbackquestions } from './startSurvey';
import * as fs from 'fs';
import path from 'path'
import { google } from 'googleapis';
import { client, db, ClientWithCommands } from './common';

client.on(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    await db.connect();
});
client.login(process.env.TOKEN); // Log in to the bot

client.on("ready", () => {
    sendTestButton()
});

// Load commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
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
        return;
    }

    // check if the interaction is a button interaction
    if (interaction.isButton()) {
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
        } else if (buttonId === 'start_test') {
            await interaction.deferUpdate();
            sendQuestion(interaction);
        } else {
            // Fetch user's context from the database
            const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });

            const userResponses = userContext?.userVector || [];

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

            specificQuestionMessage[interaction.user.id].delete();
            await interaction.deferUpdate();
            sendQuestion(interaction);
        }
    }
});

// API configuration for Google Sheets
const SHEET_ID = '1pKsioVutiEPkNwTUrW1v_Y8bFe5eQobCGpK9KVpsOo8';
const START_COLUMN = 'A';
const END_COLUMN = 'P';
const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');  // to allow easy access to column names

const jwtClient = new google.auth.JWT(
    process.env.CLIENT_EMAIL,
    undefined,
    process.env.PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth: jwtClient });

// Catch feedback messages
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    try {
        const userContext = await db.db('contrabot').collection("users").findOne({ userId: message.author.id });

        if (userContext?.feedbackInProgress) {
            let currentFeedbackQuestionIndex = userContext?.currentFeedbackQuestionIndex || 0;

            // Calculate the column where the answer should be placed.
            const columnForAnswer = COLUMNS[currentFeedbackQuestionIndex + 1];  // +1 to skip the first column which might have the userID

            // Find the row number for the current user (assuming the user's ID is in the first column)
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: `${START_COLUMN}:${START_COLUMN}`  // search in the first column only
            });
            const rows = response.data.values || [];
            let rowIndex = rows.findIndex((row: any) => row[0] === message.author.id.toString()) + 1; // +1 because index is 0-based and rows in Google Sheets are 1-based.

            // If the user is not found, create a new row for them
            if (rowIndex === 0) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SHEET_ID,
                    range: `${START_COLUMN}:${END_COLUMN}`,
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS',
                    resource: {
                        values: [
                            [message.author.id]  // userID in the first column
                        ]
                    }
                } as any);
                rowIndex = rows.length + 1;  // New row index
            }

            // Update the particular cell with the answer
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `${columnForAnswer}${rowIndex}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [
                        [message.content]
                    ]
                }
            } as any);

            currentFeedbackQuestionIndex++;

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


export { client, db };