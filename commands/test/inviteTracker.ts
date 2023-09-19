
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role } from 'discord.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { client, db } from '../../index';


async function trackInvites() {

    // Ensure you're using the correct intents
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildInvites,
        ],
    });

    client.once('ready', async () => {
        // Replace 'YOUR_GUILD_ID' with your guild's ID
        const guild = client.guilds.cache.get('YOUR_GUILD_ID');

        if (guild) {
            // Fetch all members in the guild
            await guild.members.fetch();

            // Fetch invites for the guild
            const invites = await guild.invites.fetch();

            // Create a map to store user invite counts
            const userInviteCounts = new Map();

            invites.forEach((invite) => {
                const inviter = invite.inviter;

                // Increment the invite count for the inviter
                if (inviter) {
                    const inviteCount = userInviteCounts.get(inviter.id) || 0;
                    userInviteCounts.set(inviter.id, inviteCount + invite.uses);
                }
            });

            // Update the user invite counts in your database
            const users = await db.db('contrabot').collection('users').find({}).toArray();

            for (const user of users) {
                const userId = user.userId;
                const inviteCount = userInviteCounts.get(userId) || 0;

                // Update the invite count for the user in the database
                await db.db('contrabot').collection('users').updateOne(
                    { userId: userId },
                    { $set: { inviteCount: inviteCount } }
                );
            }
        }
    });

}
