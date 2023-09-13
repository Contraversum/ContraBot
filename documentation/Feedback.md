# Documentation: ContraBot Feedback Feature

## Overiew 

After a user completes the political test, the bot will, after one week, check if the user would be willing to provide feedback. This feedback is then saved to a Google Sheet for further analysis.

### Reset User Context in Database

Once the political survey is completed, the bot resets the user's context in the database, setting the current question index back to the beginning and noting the completion time.

**test-command.ts**
```typescript
await db.db('contrabot').collection("users").updateOne(
    { userId: interaction.user.id },
    {
        $set: {
            currentQuestionIndex: 0,  // Reset to first question
            completionTime: DateTime.now().toISO(), // Set completion time
        }
    }
);
```

### Feedback Request Function

The function `checkForFeedbackRequests` is executed periodically to check which users finished their survey a week ago and have not been prompted for feedback.

1. It first calculates the date a week ago.
2. It then fetches users from the database who finished the survey more than a week ago and haven't been asked for feedback.
3. It sends a feedback request message to those users and updates the database to ensure they won't be prompted again.
4. It creates a button to start the survey and sends it to the user.

**test-command.ts**
```typescript
const checkForFeedbackRequests = async () => {
    const now = DateTime.now();
    const oneWeekAgo = now.minus({ days: 7 });

    const users = await db.db('contrabot').collection("users").find({
        completionTime: { 
            $lt: oneWeekAgo.toISO()
        },
        feedbackRequestSent: { $ne: true } // This ensures that you don't ask for feedback multiple times
    }).toArray();

    // Create a button to start the survey
    const startSurveyButton = new ButtonBuilder()
        .setCustomId('start_survey')
        .setLabel('Start Survey')
        .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(startSurveyButton);

    for (const user of users) {
        const discordUser = await client.users.fetch(user.userId);
        if (discordUser) {
            await discordUser.send({
                content: `
                Hallo 👋, vor einer Woche hast du den Test ausgefüllt. 
                Wir können Contraversum nur verbessern durch Feedback von unseren Nutzern. 
                Daher wäre es ein wichtiger Beitrag für das Projekt und damit auch für die depolarisierung 
                der Gesellschaft wenn du uns Feedback geben könntest, es dauert weniger als 3 Minuten. Vielen Dank, dein ContraBot ❤️`,
                components: [actionRow]
            });

            // Update context for this user in the database
            await db.db('contrabot').collection("users").updateOne(
                { userId: user.userId }, 
                { 
                    $set: { 
                        feedbackRequestSent: true
                    }
                }
            );
        }
    }
};

const job = new cron.CronJob('0 0 * * * *', checkForFeedbackRequests); // checks for Feedback every hour
job.start();
```

### Feedback Questions

The bot uses an array of predefined questions to query users for feedback. These questions are presented in sequence, starting from the first index in the array. After the user has responded to all questions, they are thanked for their feedback.

The `Feedbackquestions` array is initialized with two questions:

- A general feedback question: 'Gibt es sonst noch etwas, das du uns mitteilen möchtest?'
- A request for the user's email: 'Was ist deine Mailadresse?'

The function `sendSurveyQuestions` initiates the feedback process by sending the first question from the `Feedbackquestions` array to the user.

**startSurvey.ts**
```typescript
const Feedbackquestions = [
    // General feedback question
];

async function sendSurveyQuestions(interaction: any) {
    console.log("Starting survey for user " + interaction.user.id);
    interaction.user.send(Feedbackquestions[0]);  // Send the first survey question
}

export { sendSurveyQuestions, Feedbackquestions }
```

To streamline the user's experience, button interactions are employed. When a user interacts with the 'Start Survey' button, the bot:

1. Recognizes the button interaction.
2. Defers the update to keep the button's state consistent.
3. Calls the `sendSurveyQuestions` function to initiate the survey. 
4. Updates the user's context in the database, marking that the feedback process is underway and recording the current feedback question index.

**index.ts**
```typescript
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
}
```

### API Configuration and Feedback Message Handler

This part configures the API for Google Sheets, where feedback responses will be stored.

1. We have the Google Sheet's ID and the range of columns where data will be stored.
2. We set up the Google Sheets API client with necessary authentication.
3. We listen to the MessageCreate event of our bot to catch feedback messages from users.

The main logic is:

- If the user's message is a feedback response, determine the appropriate column in the Google Sheet based on the question number.
- If the user hasn't given any feedback before, add a new row with their Discord ID. If they have, find their existing row.
- Update the appropriate cell with their feedback.
- If there are more feedback questions, ask the next one. Otherwise, thank the user for their feedback.

**index.ts**
```typescript
// API configuration for Google Sheets
const SHEET_ID = '1pKsioVutiEPkNwTUrW1v_Y8bFe5eQobCGpK9KVpsOo8';
const START_COLUMN = 'A';
const END_COLUMN = 'P';
const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');  // to allow easy access to column names
const sheetConfig = JSON.parse(fs.readFileSync('./sheetConfig.json', 'utf-8'));

const jwtClient = new google.auth.JWT(
  sheetConfig.client_email,
  undefined,
  sheetConfig.private_key,
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
            let rowIndex = rows.findIndex(row => row[0] === message.author.id.toString()) + 1; // +1 because index is 0-based and rows in Google Sheets are 1-based.

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
```

## How to use 

1. **Ensure the Dependencies:** Ensure you have required dependencies installed, including the Google Sheets API and the Discord.js library.
2. **Setup Database:** Ensure MongoDB is setup and contains a collection named users in a database named contrabot.
3. **Update sheetConfig.json**: This file should contain your Google Sheets API credentials, including client_email and private_key.
4. **Run the Bot:** Simply execute the main script, and the bot should start listening for feedback from users.

### Contributing

When contributing to this code:

- Ensure any new functions are well-documented.
- Ensure compatibility with existing database schema.
- Test all changes locally before pushing to the main branch.