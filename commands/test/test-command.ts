import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role, User, TextChannel } from 'discord.js';
import { client, db } from '../../common';
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

    (guild.channels.cache.get("1135557183845711983") as TextChannel).send({ components: [actionRow] }); // Channel Id for #How-to-basics
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

        for (const [userID, member] of members) {
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
    let userResponses = userContext?.userVector || [];
    var currentQuestionDisplay = currentQuestionIndex + 1

    if (currentQuestionIndex === 0) {
        userResponses = [];
    }

    if (currentQuestionIndex < questions.length) {
        const embed = new EmbedBuilder()
            .setTitle("Frage: " + currentQuestionDisplay + "/38")
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


        // Update context for this user in the database
        await db.db('contrabot').collection("users").updateOne(
            { userId: interaction.user.id },
            {
                $set: {
                    userId: interaction.user.id,
                    username: interaction.user.username,

                    currentQuestionIndex: currentQuestionIndex + 1,
                    userVector: userResponses,
                    feedbackRequestSent: false,
                    currentFeedbackQuestionIndex: 0,
                    invited: interaction.user.invited,
                    joined: interaction.user.joinedTimestamp

                }
            },
            { upsert: true }
        );
    } else {
        const guildId = process.env.GUILD_ID;
        if (!guildId) throw new Error('GUILD_ID not found');

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

function verifyUser(interaction: any, guild: Guild) {
    const role: Role | undefined = guild.roles.cache.get('1143590879274213486'); // Verified role: 1143590879274213486
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

