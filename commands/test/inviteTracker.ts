import { Guild, GuildMember, Role, Collection } from 'discord.js';
import { client, db } from '../../index';
import cron from 'cron';

async function trackInvites() {
    console.log('Invite tracker is working!');

    const guild: Guild | undefined = client.guilds.cache.get('1119231777391788062');
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    // Fetch invites for the guild
    const invites = await guild.invites.fetch();

    // Create an object to store invite data per user
    const inviteData: { [key: string]: number } = {};

    // Store number of invites per inviter
    invites.forEach((invite) => {
        const inviter = invite.inviter;

        if (inviter) {
            const inviterId = inviter.id;
            const inviteCount = (invite.uses !== null ? invite.uses : 0);

            // Increment the invite count for the inviter
            inviteData[inviterId] = (inviteData[inviterId] || 0) + inviteCount;
        }
    });


    // Update the user invite counts
    const users = await db.db('contrabot').collection('users').find({}).toArray();

    for (const user of users) {
        const userId = user.userId;
        if (!userId) {
            console.error('Member ID not found for a user');
            continue; // Skip this user and continue with others
        }

        let inviteCount = inviteData[userId] || 0;

        // Update the invite count for the user in the database
        await db.db('contrabot').collection('users').updateOne(
            { userId: userId },
            { $set: { inviteCount: inviteCount } }
        );

        assignRoles(inviteCount, userId, guild);
    }
}


async function assignRoles(inviteCount: number, userId: string, guild: Guild) {
    const rolesToAssign = [
        { role: '1153789870582550598', minInviteCount: 1, maxInviteCount: 2 },
        { role: '1153796740072349726', minInviteCount: 3, maxInviteCount: 4 },
        { role: '1153992358212423730', minInviteCount: 5, maxInviteCount: Infinity },
    ];
    const rolesToRemove: Collection<string, Role> = new Collection();

    const member = await guild.members.fetch(userId);

    for (const { role, minInviteCount, maxInviteCount } of rolesToAssign) {
        const targetRole = guild.roles.cache.get(role);

        if (!targetRole) {
            console.error(`Role not found for user ${userId} `);
            continue;
        } else if (!member) {
            console.error(`Member not found`);
            continue;
        }

        if (inviteCount >= minInviteCount && inviteCount <= maxInviteCount) {
            if (!member.roles.cache.has(targetRole.id)) {
                await member.roles.add(targetRole).catch(console.error);
            }
        } else {
            rolesToRemove.set(targetRole.id, targetRole);
        }
    }
    removeRoles(rolesToRemove, member);
}

async function removeRoles(rolesToRemove: Collection<string, Role>, member: GuildMember) {
    for (const role of rolesToRemove.values()) {
        if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role).catch(console.error);
        }
    }
}

const job = new cron.CronJob('0 0 * * * *', trackInvites); // checks for invites every hour
job.start();