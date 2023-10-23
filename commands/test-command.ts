import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role, User, TextChannel, ChatInputCommandInteraction } from 'discord.js';
import cron from 'cron';
import 'dotenv/config';
import questions from '../questions.json';
import { db, client } from "../common";
import { encrypt, decrypt } from "../encryptionUtils";
import { findMatchingUser } from "../functions/findMatchingUser";
import { conversationStarter } from "../functions/conversationStarter";

async function checkForFeedbackRequests() {
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


export async function sendTestButton() {
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

    (guild.channels.cache.get("1135557183845711983") as TextChannel).send({ components: [actionRow] }); // Channel Id for #How-to-basics
};



async function sendTestReminder() {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID!)!;

        const members = await guild.members.fetch();

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        for (const [userID, member] of members) {
            const joinDate = member.joinedAt;
            if (!joinDate) continue;

            const user = await db.db('contrabot').collection('users').findOne({ userId: userID });

            if (!member.roles.cache.has("1143590879274213486") && joinDate <= oneWeekAgo && !user?.reminderSent) {
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
    } catch { }
};

// Schedule the function to run every day
const dailyJob = new cron.CronJob('0 0 0 * * *', sendTestReminder);
dailyJob.start();

export async function sendQuestion(interaction: any) {
    const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });

    const currentQuestionIndex = userContext?.currentQuestionIndex || 0;
    let userResponses;
    if (Array.isArray(userContext?.userVector)) {
        userResponses = userContext?.userVector || [];
    } else {
        userResponses = userContext?.userVector ? JSON.parse(decrypt(userContext.userVector)) : [];
    }

    const currentQuestionDisplay = currentQuestionIndex + 1

    if (currentQuestionIndex === 0) {
        userResponses = [];
    }

    if (currentQuestionIndex < questions.length) {
        const embed = new EmbedBuilder()
            .setTitle(`Frage: ${currentQuestionDisplay}/38`)
            .setDescription(questions[currentQuestionIndex].question)
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
            embeds: [embed],
            components: [builder]
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
        return;
    }

    await initiateConversation(interaction, userResponses);

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

async function initiateConversation(interaction: any, userResponses: number[]): Promise<any> {
    const guild = client.guilds.cache.get(process.env.GUILD_ID!)!;

    const bestMatchId = await findMatchingUser(interaction.user.id, userResponses);

    if (bestMatchId) {
        const isMember = await guild.members.fetch(bestMatchId).then(() => true).catch(() => false);
        if (!isMember) {
            await db.db('contrabot').collection("users").deleteOne({ bestMatchId });
            console.log(`Deleted: userId ${bestMatchId} is no longer on the server.`);
            return await initiateConversation(interaction, userResponses);
        }
    } else {
        interaction.user.send("Leider konnte zur Zeit kein geeigneter Gesprächspartner gefunden werden. Bitte versuchen Sie es später erneut.");
        return;
    }

    const interactionGuildMember = guild.members.cache.get(interaction.user.id);
    if (!interactionGuildMember) throw new Error('interactionGuildMember was not found');

    const bestMatch = await guild.members.fetch(bestMatchId);
    if (!bestMatch) throw new Error('bestMatch.GuildMember was not found');

    const matchesCategory = guild.channels.cache.find((category: any) => category.name === 'matches' && category.type === 4);
    const channelName = `match-${interaction.user.username}-${bestMatch.user.username}`;

    const textChannel = await guild.channels.create({
        parent: matchesCategory?.id,
        name: channelName.toLowerCase(),
        type: 0,
    });

    await textChannel.permissionOverwrites.edit(interactionGuildMember, {
        ViewChannel: true,
        SendMessages: true,
    });
    await textChannel.permissionOverwrites.edit(bestMatch, {
        ViewChannel: true,
        SendMessages: true,
    });

    const everyone = await guild.roles.everyone;
    await textChannel.permissionOverwrites.edit(everyone, {
        ViewChannel: false,
    });

    await textChannel.send(`Hallo ${interactionGuildMember} 👋, hallo ${bestMatch.user.username} 👋, basierend auf unserem Algorithmus wurdet ihr als Gesprächspartner ausgewählt. Bitte vergesst nicht respektvoll zu bleiben. Viel Spaß bei eurem Match!`);
    await textChannel.send(`Bei beispielsweise diesen drei Fragen seid ihr nicht einer Meinung:`);

    // This function will send starter questions where they disagreed
    conversationStarter(textChannel, interaction, bestMatch, userResponses);

    interaction.user.send(`Du wurdest erfolgreich mit **@${bestMatch.user.username}** gematcht. Schau auf den Discord-Server um mit dem Chatten zu beginnen! 😊`);
    client.users.fetch(bestMatchId).then(user => {
        user.send(`Du wurdest mit **@${interaction.user.username}** gematcht. Schau auf den Discord-Server um mit dem Chatten zu beginnen! 😊`);
    });

    verifyUser(interaction, guild);

    // Add conversation to database
    const conversationInitiationTime = new Date();
    await db.db('contrabot').collection('conversations').insertOne({
        initiationTime: conversationInitiationTime,
        interactionUserId: interaction.user.id,
        bestMatchUserId: bestMatchId,
        channelId: textChannel.id,
        eightHourNotificationSent: false
    });
}

function verifyUser(interaction: any, guild: Guild) {
    const role: Role | undefined = guild.roles.cache.get('1153647196449820755'); // Verified role: 1143590879274213486
    if (!role) throw new Error('Role not found');

    const interactionGuildMember = guild.members.cache.get(interaction.user.id);
    if (!interactionGuildMember) throw new Error('Guild not found');

    interactionGuildMember.roles.add(role).catch(console.error);
}

export async function executeTest(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
        content: 'Deine Meinung ist gefragt! Bitte kommentiere die folgenden These mit 👍, 👎 oder 😐. Test wurde gestartet.\nBitte schaue in deinen Direktnachrichten nach :)',
        ephemeral: true,
    });
    sendQuestion(interaction);
};
