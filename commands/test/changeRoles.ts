import { Guild, Role } from 'discord.js';
import { client, db } from '../../index';
import cron from 'cron';


async function hi() {

    console.log('change Roles is working!')

    // Fetch users from the database
    const users = await db.db('contrabot').collection("users").find({}).toArray();

    // Get the guild and role
    const guild = client.guilds.cache.get('1119231777391788062');
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    const role = guild.roles.cache.get('1153789870582550598');
    if (!role) {
        console.error('Role not found');
        return;
    }

    // Define an object to store invite data per user
    const invites: { [key: string]: { [key: string]: number } } = {};

    try {
        // Fetch all Guild Invites
        const firstInvites = await guild.invites.fetch();

        // Populate the invites object with invite code and uses
        firstInvites.forEach((invite) => {
            if (invite.uses !== null && invite.inviter) {
                const inviterId = invite.inviter.id;

                // Find the user in the 'users' array
                const user = users.find((user) => user.discordId === inviterId);

                if (user) {
                    // Store invite data based on user
                    invites[user.discordId] = invites[user.discordId] || {};
                    invites[user.discordId][invite.code] = invite.uses;
                }
            }
        });
    } catch (error) {
        console.error('Error fetching invites:', error);
        return;
    }

    // Event listener for inviteDelete
    client.on("inviteDelete", (invite) => {
        if (invite.inviter) {
            const inviterId = invite.inviter.id;

            // Find the user in the 'users' array
            const user = users.find((user) => user.discordId === inviterId);

            if (user && invites[user.discordId]) {
                delete invites[user.discordId][invite.code];
            }
        }
    });

    // Event listener for inviteCreate
    client.on("inviteCreate", (invite) => {
        if (invite.inviter) {
            const inviterId = invite.inviter.id;

            // Find the user in the 'users' array
            const user = users.find((user) => user.discordId === inviterId);

            if (user) {
                // Store invite data based on user, ensuring invite.uses is a valid number
                if (typeof invite.uses === 'number') {
                    invites[user.discordId] = invites[user.discordId] || {};
                    invites[user.discordId][invite.code] = invite.uses;
                }
            }
        }
    });

    // Update the 'invite' property for all users
    for (const userId in invites) {
        const inviteCount = Object.values(invites[userId]).reduce((acc, count) => acc + count, 0);

        // Update the 'invite' property for each user
        await db.db('contrabot').collection("users").updateOne(
            { discordId: userId },
            {
                $set: {
                    invite: inviteCount,
                }
            }
        );
    }
}

const job = new cron.CronJob('0 * * * * *', hi); // checks for invites every hour
//job.start();