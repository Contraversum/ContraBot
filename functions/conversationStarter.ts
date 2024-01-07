import { EmbedBuilder, User } from 'discord.js';
import { questions } from '../questions';
import { CronJob } from "cron";
import { client, db } from "../common";

export async function conversationStarter(channelOfDestination: any, interaction: any, bestMatchUserResponses: any, bestMatchId: any, user: number[]) {
    console.log(user);
    console.log(bestMatchUserResponses);
    // get all contrasting and similar answers
    let addedToDisagree = false; // Track if any numbers were added to disagree
    const disagree: number[] = [];

    user.forEach((value, i) => {
        const total = value + bestMatchUserResponses[ i ];
        if (value !== 0 && total === 0) {
            disagree.push(i);
            addedToDisagree = true;
        }
    });
    // Only add to disagree if the flag is still false
    if (!addedToDisagree || disagree.length < 6) {
        user.forEach((value, i) => {
            const total = value + bestMatchUserResponses[ i ];
            if (Math.abs(total) === 1) {
                disagree.push(i);
            }
        });
    }

    const selectedIndexes = getRandomDisagreement(disagree, 6);
    sendDisagreedQuestions(channelOfDestination, selectedIndexes.slice(0, 3));


    let bestMatchSentMessage = false;

    client.on('messageCreate', (message: any) => {
        if (message.channel.id === channelOfDestination.id) {
            if (message.author.id === bestMatchId) {
                bestMatchSentMessage = true;
                return;
            }
        }
    });

    // send message into the channel after 8 hours if no message was sent
    const eightHourCheck = new CronJob('0 */8 * * *', async () => {
        const conversations = await db.db('contrabot').collection('conversations').find({
            channelId: channelOfDestination.id
        }).toArray();

        conversations.forEach(async (conv) => {
            if (!bestMatchSentMessage && !conv.eightHourNotificationSent) {
                await channelOfDestination.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`👋 Hallo ${interaction.user.username}, dein Gesprächspartner hat sich noch nicht gemeldet.`)
                            .setDescription(`Nach 24 Stunden inactivität wirst du ein neuen Gesprächspartner erhalten.`)
                            .setColor('#fb2364')
                    ]
                });
                // update flag in the database
                await db.db('contrabot').collection('conversations').updateOne(
                    { channelId: channelOfDestination.id },
                    { $set: { eightHourNotificationSent: true } }
                );
            }
        });

    });
    eightHourCheck.start();

    const twentyFourHourCheck = new CronJob('0 0 */1 * *', async () => {
        const conversations = await db.db('contrabot').collection('conversations').find({
            channelId: channelOfDestination.id
        }).toArray();

        conversations.forEach(async (conv) => {
            if (!bestMatchSentMessage && conv.eightHourNotificationSent) {
                //Send messages to both users
                interaction.user.send(`Dein Gesprächspartner hat das Gespräch verlassen. Wir finden einen neuen Gesprächspartner für dich.`);
                client.users.fetch(String(bestMatchUserResponses)).then((user: User) => {
                    user.send(`Aufgrund von Inaktivität wurde das Gespräch beendet. Bitte starte einen neuen Test, um einen neuen Gesprächspartner zu finden.`);
                });

                // Delete the channel, conversation and BestMatch from the database
                channelOfDestination.delete();
                db.db('contrabot').collection("conversations").deleteOne({ _id: conv._id });
                await db.db('contrabot').collection("users").deleteOne({ userId: bestMatchId });
            }
        });
    });
    twentyFourHourCheck.start();
}

function getRandomDisagreement(arr: number[], num: number) {
    return Array.from({ length: Math.min(num, arr.length) }, () => arr.splice(Math.floor(Math.random() * arr.length), 1)[ 0 ]);
}

function sendDisagreedQuestions(channelOfDestination: any, disagree: number[]) {
    disagree.forEach((value) => {
        channelOfDestination.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Frage: ${value + 1}/38`)
                    .setDescription(questions[ value ].question)
                    .setColor('#fb2364')
            ]
        });
    });

    // Make it so that the tags of the questions are printed properly
    const selectedTags = disagree
        .map(index => questions[ index ].tag)
        .filter(tag => tag)
        .slice(0, 3);

    const topicsMessage = `Als Gesprächsthemen können z.B. ${selectedTags.map(tag => `**${tag}**`).join(", ")} besprochen werden.`;
    channelOfDestination.send(topicsMessage);
}