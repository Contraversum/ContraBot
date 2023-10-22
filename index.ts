import 'dotenv/config'
import { Events, REST, Routes } from 'discord.js';
import { executeTest, sendQuestion, sendTestButton } from './commands/test-command';
import { sendSurveyQuestions, Feedbackquestions } from './functions/startSurvey';
import { google } from 'googleapis';
import { client, db } from './common';
import { executeMatch } from "./commands/match-command";
import { trackInvites } from "./inviteTracker";

client.on(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    await db.connect();
    await trackInvites();
});
client.login(process.env.TOKEN); // Log in to the bot

client.on(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    await db.connect();
    sendTestButton()
    //add later
    //client.user.setActivity("123", {ActivityType.Listening})

    const rest = new REST().setToken(process.env.TOKEN!);

    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(Routes.applicationCommands(client.user!.id), {
                body:
                    [
                        {
                            name: 'match',
                            description: 'Requests new match without retaking the test.'
                        },
                        {
                            name: 'test',
                            description: 'Asks the test questions!'
                        },
                    ]
            });

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();

});

// Catch command errors
client.on(Events.InteractionCreate, async interaction => {
    // Handle Slash commands
    if (interaction.isChatInputCommand()) {
        try {
            if (interaction.commandName === 'test')
                await executeTest(interaction);
            else if (interaction.commandName === 'match')
                await executeMatch(interaction);
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

            const userResponses = userContext?.userVector ? JSON.parse(decrypt(userContext.userVector)) : [];

            // Update the userResponses based on button clicked
            if (buttonId === 'agree') userResponses.push(1);
            else if (buttonId === 'disagree') userResponses.push(-1);
            else if (buttonId === 'neutral') userResponses.push(0);

            // Update the userResponses for this user in the database
            const encryptedUserVector = encrypt(JSON.stringify(userResponses));
            await db.db('contrabot').collection("users").updateOne(
                { userId: interaction.user.id },
                {
                    $set: {
                        userVector: encryptedUserVector
                    }
                }
            );

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
    [ 'https://www.googleapis.com/auth/spreadsheets' ]
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
            const columnForAnswer = COLUMNS[ currentFeedbackQuestionIndex + 1 ];  // +1 to skip the first column which might have the userID

            // Find the row number for the current user (assuming the user's ID is in the first column)
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: `${START_COLUMN}:${START_COLUMN}`  // search in the first column only
            });
            const rows = response.data.values || [];
            let rowIndex = rows.findIndex((row: any) => row[ 0 ] === message.author.id.toString()) + 1; // +1 because index is 0-based and rows in Google Sheets are 1-based.

            // If the user is not found, create a new row for them
            if (rowIndex === 0) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SHEET_ID,
                    range: `${START_COLUMN}:${END_COLUMN}`,
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS',
                    resource: {
                        values: [
                            [ message.author.id ]  // userID in the first column
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
                        [ message.content ]
                    ]
                }
            } as any);

            currentFeedbackQuestionIndex++;

            if (currentFeedbackQuestionIndex < Feedbackquestions.length) {
                message.author.send(Feedbackquestions[ currentFeedbackQuestionIndex ]);

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

client.on('guildMemberAdd', async () => {
    await trackInvites();
});

export { client, db };
