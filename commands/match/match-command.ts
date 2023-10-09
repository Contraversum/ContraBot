import { SlashCommandBuilder, Guild } from 'discord.js';
import { client, db } from '../../common';
import 'dotenv/config';
import findMatchingUser from '../../functions/findMatchingUser';
import conversationStarter from '../../functions/conversationStarter';

export const sendQuestion = async (interaction: any) => {

    const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });

    let currentQuestionIndex = userContext?.currentQuestionIndex || 0;
    let userResponses = userContext?.userVector || [];

    if (currentQuestionIndex === 0) {
        userResponses = [];
    }

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
    } else {
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

export const data = new SlashCommandBuilder().setName('match').setDescription('Requests new match without retaking the test.');
export const execute = async (interaction: any) => {
    await interaction.reply({
        content: 'Neues Match wird ermittelt. Bitte schaue in deinen Direktnachrichten nach :)',
        ephemeral: true,
    });
    sendQuestion(interaction);
};
