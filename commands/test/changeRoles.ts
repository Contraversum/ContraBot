import { Guild, Role } from 'discord.js';
import { client, db } from '../../index';
import cron from 'cron';

async function hi() {
    console.log('change Roles is working!')

    // Fetch users from the database
    const users = await db.db('contrabot').collection("users").find({}).toArray();

    // Get the guild and roles
    const guild = client.guilds.cache.get('1119231777391788062');
    if (!guild) {
        console.error('Guild not found');
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
                const user = users.find((user) => user.userId === inviterId);

                if (user) {
                    invites[user.userId] = invites[user.userId] || {};
                    invites[user.userId][invite.code] = invite.uses;
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
            const user = users.find((user) => user.userId === inviterId);

            if (user && invites[user.userId]) {
                delete invites[user.userId][invite.code];
            }
        }
    });

    // Event listener for inviteCreate
    client.on("inviteCreate", (invite) => {
        if (invite.inviter) {
            const inviterId = invite.inviter.id;
            const user = users.find((user) => user.userId === inviterId);

            if (user) {
                if (typeof invite.uses === 'number') {
                    invites[user.userId] = invites[user.userId] || {};
                    invites[user.userId][invite.code] = invite.uses;
                }
            }
        }
    });

    // Update the 'invite' property for all users and assign roles based on inviteCount
    for (const userId in invites) {
        if (!userId) {
            console.error('Member ID not found for a user');
            continue;
        }

        const inviteCount = Object.values(invites[userId]).reduce((acc, count) => acc + count, 0);

        const rolesToAssign = [
            { role: '1153789870582550598', minInviteCount: 0, maxInviteCount: 2 },
            { role: '1153796740072349726', minInviteCount: 3, maxInviteCount: 4 },
            { role: '1153992358212423730', minInviteCount: 5, maxInviteCount: Infinity },
        ];

        for (const { role, minInviteCount, maxInviteCount } of rolesToAssign) {
            if (inviteCount >= minInviteCount && inviteCount <= maxInviteCount) {
                assignRoleIfQualified(role, userId, guild);
                break; // Stop after assigning the highest matching role
            }
        }
    }
}

async function assignRoleIfQualified(roleId: string, userId: any, guild: Guild) {
    const member = await guild.members.fetch(userId);
    if (member) {
        if (!member.roles.cache.has(roleId)) {
            await member.roles.add(roleId).catch(console.error);
        }
    } else {
        console.error('Member not found');
    }
}

const job = new cron.CronJob('0 * * * * *', hi); // checks for invites every minute
//job.start();