import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role, User, TextChannel } from 'discord.js';
import { client, db } from '../../common';
import { encrypt, decrypt } from '../../encryptionUtils';
import cron from 'cron';
import 'dotenv/config';
import questions from '../../questions';
import findMatchingUser from '../../functions/findMatchingUser';
import conversationStarter from '../../functions/conversationStarter';

const checkForFeedbackRequests = async () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const users = await db.db('contrabot').collection("users").find({
        completionTime: {
            $lt: oneWeekAgo.toISOString()
        },
        feedbackRequestSent: { $ne: true } // This ensures that you don't ask for feedback multiple times
    }).toArray();

    // Create a button to start the survey
    const startSurveyButton = new ButtonBuilder()
        .setCustomId('start_survey')
        .setLabel('Jetzt Feedback geben')
        .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(startSurveyButton);

    for (const user of users) {
        const discordUser = await client.users.fetch(user.userId);
        if (discordUser) {
            await discordUser.send({
                content: `
            Hallo 👋, vor einer Woche hast du den Test ausgefüllt.
            Wir können Contraversum nur durch Feedback unserer Nutzerinnen und Nutzer verbessern.
            Daher wäre es ein wichtiger Beitrag für das Projekt und damit auch für die Depolarisierung
            der Gesellschaft, wenn du uns Feedback geben könntest. Es dauert weniger als 3 Minuten. Vielen Dank, dein ContraBot ❤️`,
                components: [ actionRow ]
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


export const sendTestButton = async () => {
    const button = new ButtonBuilder()
        .setCustomId('start_test')
        .setLabel('Start Test')
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

    const guildId = process.env.GUILD_ID;
    if (!guildId) throw new Error('GUILD_ID is not defined in .env');

    const guild: Guild | undefined = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    (guild.channels.cache.get("1135557183845711983") as TextChannel).send({ components: [ actionRow ] }); // Channel Id for #How-to-basics
};



const sendTestReminder = async () => {
    try {
        const guildId = process.env.GUILD_ID;
        if (!guildId) throw new Error('GUILD_ID is not defined in .env');

        const guild: Guild | undefined = client.guilds.cache.get(guildId);
        if (!guild) throw new Error('Guild not found');

        const verifiedRole: Role | undefined = guild.roles.cache.get('1143590879274213486');
        if (!verifiedRole) throw new Error('Verified role not found');

        const members = await guild.members.fetch().catch(console.error);
        if (!members) throw new Error('Verified role not found');

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        for (const [ userID, member ] of members) {
            const joinDate = member.joinedAt;
            if (!joinDate) continue;

            const user = await db.db('contrabot').collection('users').findOne({ userId: userID });

            if (
                !member.roles.cache.has(verifiedRole.id) &&
                joinDate <= oneWeekAgo &&
                !user?.reminderSent
            ) {
                // Send the test reminder to the member
                await member.send("Hey 👋, du hast den Test noch nicht ausgefüllt. Wir würden uns freuen, wenn du den Test noch ausfüllst, damit du mit anderen Usern gematcht werden kannst.");
                await member.send("Um einen Test zu starten, tippe /test in den Server ein oder klicke auf die rote Taste 'Test starten' im Channel #how-to-basics.");

                // Add the user to the database and creates reminderSent status
                await db.db('contrabot').collection('users').updateOne(
                    { userId: userID },
                    {
                        $set:
                            { reminderSent: true }
                    },
                    { upsert: true }
                );
            }
        }
    } catch (error) {
        console.error('Error sending test reminders:', error);
    }
};

// Schedule the function to run every day
const dailyJob = new cron.CronJob('0 0 0 * * *', sendTestReminder);
dailyJob.start();

export const sendQuestion = async (interaction: any) => {

    const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });

    let currentQuestionIndex = userContext?.currentQuestionIndex || 0;
    let userResponses;
    if (Array.isArray(userContext?.userVector)) {
        userResponses = userContext?.userVector || [];
    } else {
        userResponses = userContext?.userVector ? JSON.parse(decrypt(userContext.userVector)) : [];
    }
    var currentQuestionDisplay = currentQuestionIndex + 1

    if (currentQuestionIndex === 0) {
        userResponses = [];
    }

    if (currentQuestionIndex < questions.length) {
        const embed = new EmbedBuilder()
            .setTitle("Frage: " + currentQuestionDisplay + "/38")
            .setDescription(questions[ currentQuestionIndex ].question)
            .setColor('#fb2364');

        const builder = new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setCustomId(`agree`)
                .setStyle(ButtonStyle.Success)
                .setEmoji("👍"),
            new ButtonBuilder()
                .setCustomId(`neutral`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("😐"),
            new ButtonBuilder()
                .setCustomId(`disagree`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji("👎"),
        ]);

        interaction.user.send({
            embeds: [ embed ],
            components: [ builder ]
        });

        const encryptedUserVector = encrypt(JSON.stringify(userResponses));
        // Update context for this user in the database
        await db.db('contrabot').collection("users").updateOne(
            { userId: interaction.user.id },
            {
                $set: {
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    currentQuestionIndex: currentQuestionIndex + 1,
                    userVector: encryptedUserVector,
                    currentFeedbackQuestionIndex: 0,
                    invited: interaction.user.invited,
                    joined: interaction.user.joinedTimestamp
                },
                $setOnInsert: {
                    feedbackRequestSent: false
                }
            },
            { upsert: true }
        );

    } else {
        initiateConversation(interaction, userResponses);

        const guild: Guild | undefined = client.guilds.cache.get(guildId);
        if (!guild) throw new Error('Guild not found');

        const bestMatch = await findMatchingUser(interaction.user.id, userResponses, guild);
        if (bestMatch) {
            const interactionGuildMember = guild.members.cache.get(interaction.user.id);
            if (!interactionGuildMember) throw new Error('interactionGuildMember was nog found');

            bestMatch.GuildMember = await guild.members.fetch(bestMatch.userId);
            if (!guild) throw new Error('bestMatch.GuildMember');

            const matchesCategory = guild.channels.cache.find((category: any) => category.name === 'matches' && category.type === 4);

            const channelName = `match-${interaction.user.username}-${bestMatch.username}`;

            const textChannel = await guild.channels.create({
                parent: matchesCategory?.id,
                name: channelName.toLowerCase(),
                type: 0,
            });

            await textChannel.permissionOverwrites.edit(interactionGuildMember, {
                ViewChannel: true,
                SendMessages: true,
            });
            await textChannel.permissionOverwrites.edit(bestMatch.GuildMember, {
                ViewChannel: true,
                SendMessages: true,
            });

            const everyone = await guild.roles.everyone;

            await textChannel.permissionOverwrites.edit(everyone, {
                ViewChannel: false,
            });

            await textChannel.send(`Hallo ${interactionGuildMember} 👋, hallo ${bestMatch.GuildMember} 👋, basierend auf unserem Algorithmus wurdet ihr als Gesprächspartner ausgewählt. Bitte vergesst nicht respektvoll zu bleiben. Viel Spaß bei eurem Match!`);
            await textChannel.send(`Bei beispielsweise diesen drei Fragen seid ihr nicht einer Meinung:`);
            conversationStarter(textChannel, interaction, bestMatch.userVector, userResponses);

            interaction.user.send(`Du wurdest erfolgreich mit **@${bestMatch.username}** gematcht. Schau auf den Discord-Server um mit dem Chatten zu beginnen! 😊`);

            verifyUser(interaction, guild);

        }
        else {
            console.warn('No best match found');
            interaction.user.send("Leider konnte zur Zeit kein geeigneter Gesprächspartner gefunden werden. Bitte versuchen Sie es später erneut.");
        }
        // Reset context for this user in the database
        await db.db('contrabot').collection("users").updateOne(
            { userId: interaction.user.id },
            {
                $set: {
                    currentQuestionIndex: 0,  // Reset to first question
                    completionTime: new Date().toISOString(), // Set completion time
                }
            }
        );
    }
}

async function initiateConversation(interaction: any, userResponses: number[]) {
    const guildId = process.env.GUILD_ID;
    if (!guildId) throw new Error('GUILD_ID not found');

    const guild: Guild | undefined = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const bestMatch = await findMatchingUser(interaction.user.id, userResponses, guild);
    if (!bestMatch) {
        console.warn('No best match found');
        interaction.user.send("Leider konnte zur Zeit kein geeigneter Gesprächspartner gefunden werden. Bitte versuchen Sie es später erneut.");
        return;
    }

    const interactionGuildMember = guild.members.cache.get(interaction.user.id);
    if (!interactionGuildMember) throw new Error('interactionGuildMember was not found');

    bestMatch.GuildMember = await guild.members.fetch(bestMatch.userId);
    if (!bestMatch.GuildMember) throw new Error('bestMatch.GuildMember was not found');

    const matchesCategory = guild.channels.cache.find((category: any) => category.name === 'matches' && category.type === 4);
    const channelName = `match-${interaction.user.username}-${bestMatch.username}`;

    const textChannel = await guild.channels.create({
        parent: matchesCategory?.id,
        name: channelName.toLowerCase(),
        type: 0,
    });

    await textChannel.permissionOverwrites.edit(interactionGuildMember, {
        ViewChannel: true,
        SendMessages: true,
    });
    await textChannel.permissionOverwrites.edit(bestMatch.GuildMember, {
        ViewChannel: true,
        SendMessages: true,
    });

    const everyone = await guild.roles.everyone;
    await textChannel.permissionOverwrites.edit(everyone, {
        ViewChannel: false,
    });

    await textChannel.send(`Hallo ${interactionGuildMember} 👋, hallo ${bestMatch.GuildMember} 👋, basierend auf unserem Algorithmus wurdet ihr als Gesprächspartner ausgewählt. Bitte vergesst nicht respektvoll zu bleiben. Viel Spaß bei eurem Match!`);
    await textChannel.send(`Bei beispielsweise diesen drei Fragen seid ihr nicht einer Meinung:`);

    // This function will send starter questions where they disagreed
    conversationStarter(textChannel, interaction, bestMatch, userResponses);

    interaction.user.send(`Du wurdest erfolgreich mit **@${bestMatch.username}** gematcht. Schau auf den Discord-Server um mit dem Chatten zu beginnen! 😊`);
    client.users.fetch(String(bestMatch.userId)).then((user: User) => {
        user.send(`Du wurdest mit **@${interaction.user.username}** gematcht. Schau auf den Discord-Server um mit dem Chatten zu beginnen! 😊`);
    });

    verifyUser(interaction, guild);

    // Add conversation to database
    const conversationInitiationTime = new Date();
    await db.db('contrabot').collection('conversations').insertOne({
        initiationTime: conversationInitiationTime,
        interactionUserId: interaction.user.id,
        bestMatchUserId: bestMatch.userId,
        channelId: textChannel.id,
        eightHourNotificationSent: false
    });
}

async function conversationStarter(channelOfDestination: any, interaction: any, bestMatch: any, user: number[]) {
    // get all contrasting and similar answers
    let addedToDisagree = false; // Track if any numbers were added to disagree
    const disagree: number[] = [];

    user.forEach((value, i) => {
        const total = value + bestMatch.userVector[ i ];
        if (value !== 0 && total === 0) {
            disagree.push(i);
            addedToDisagree = true;
        }
    });
    // Only add to disagree if the flag is still false
    if (!addedToDisagree || disagree.length < 6) {
        user.forEach((value, i) => {
            const total = value + bestMatch.userVector[ i ];
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
            if (message.author.id === bestMatch.userId) {
                bestMatchSentMessage = true;
                return;
            }
        }
    });

    // send message into the channel after 8 hours if no message was sent
    const eightHourCheck = new cron.CronJob('0 */8 * * *', async () => {
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

    const twentyFourHourCheck = new cron.CronJob('0 0 */1 * *', async () => {
        const conversations = await db.db('contrabot').collection('conversations').find({
            channelId: channelOfDestination.id
        }).toArray();

        conversations.forEach(async (conv) => {
            if (!bestMatchSentMessage && conv.eightHourNotificationSent) {
                //Send messages to both users
                interaction.user.send(`Dein Gesprächspartner hat das Gespräch verlassen. Wir finden einen neuen Gesprächspartner für dich.`);
                client.users.fetch(String(bestMatch.userId)).then((user: User) => {
                    user.send(`Aufgrund von Inaktivität wurde das Gespräch beendet. Bitte starte einen neuen Test, um einen neuen Gesprächspartner zu finden.`);
                });

                // Delete the channel, conversation and BestMatch from the database
                channelOfDestination.delete();
                db.db('contrabot').collection("conversations").deleteOne({ _id: conv._id });
                await db.db('contrabot').collection("users").deleteOne({ userId: bestMatch.userId });
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

async function findMatchingUser(userId: string, userResponses: number[], guild: Guild): Promise<{ userId: string, username: string, userVector: number[], GuildMember: any } | null> {
    if (!userId || !Array.isArray(userResponses) || userResponses.length === 0) {
        console.log("Invalid input parameters");
        return null;
    }

    try {
        const users = await db.db('contrabot').collection("users").find({}).toArray();

        if (!Array.isArray(users)) {
            console.error("Error retrieving users from database");
            return null;
        }

        let mostOppositeUser: { userId: string, username: string, userVector: number[], GuildMember: any } | null = null;
        let lowestDifferenceScore = Infinity;

        for (const user of users) {
            if (user.userId === userId) {
                console.log("Skipped: same userId as input userId");
                continue;
            }

            let decryptedUserVector: number[]; // Explicit type declaration
            if (typeof user.userVector === 'string') { // Check if it's a string
                try {
                    decryptedUserVector = JSON.parse(decrypt(user.userVector));
                } catch (error) {
                    console.error(`Failed to decrypt userVector for userId ${user.userId}:`, error);
                    continue;
                }
            } else {
                console.warn(`Skipped: userVector for userId ${user.userId} is not a string`);
                continue;
            }


            if (!Array.isArray(decryptedUserVector) || decryptedUserVector.length === 0) {
                console.log(`Skipped: Missing or invalid decrypted userVector for userId ${user.userId}`);
                continue;
            }

            const differenceScore = userResponses.reduce((acc, value, index) => {
                return acc + value * decryptedUserVector[ index ];
            }, 0);

            if (differenceScore < lowestDifferenceScore) {
                lowestDifferenceScore = differenceScore;
                mostOppositeUser = {
                    userId: user.userId,
                    username: user.username,
                    userVector: decryptedUserVector,
                    GuildMember: null
                };
            }
        }


        if (mostOppositeUser) {
            const isMember = await guild.members.fetch(mostOppositeUser.userId).then(() => true).catch(() => false);
            if (!isMember) {
                await db.db('contrabot').collection("users").deleteOne({ userId: mostOppositeUser.userId });
                console.log(`Deleted: userId ${mostOppositeUser.userId} is no longer on the server.`);
                return await findMatchingUser(userId, userResponses, guild); // Recursive call if the best match isn't a server member
            }
        }

        return mostOppositeUser || null;

    } catch (error) {
        console.error("Error in findMatchingUser: ", error);
        return null;
    }
}

function verifyUser(interaction: any, guild: Guild) {
    const role: Role | undefined = guild.roles.cache.get('1153647196449820755'); // Verified role: 1143590879274213486
    if (!role) throw new Error('Role not found');

    const interactionGuildMember = guild.members.cache.get(interaction.user.id);
    if (!interactionGuildMember) throw new Error('Guild not found');

    interactionGuildMember.roles.add(role).catch(console.error);
}

export const data = new SlashCommandBuilder().setName('test').setDescription('Asks the test questions!');
export const execute = async (interaction: any) => {
    await interaction.reply({
        content: 'Deine Meinung ist gefragt! Bitte kommentiere die folgenden These mit 👍, 👎 oder 😐. Test wurde gestartet.\nBitte schaue in deinen Direktnachrichten nach :)',
        ephemeral: true,
    });
    sendQuestion(interaction);
};
