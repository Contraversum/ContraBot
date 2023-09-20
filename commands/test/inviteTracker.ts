import { Guild, Role } from 'discord.js';
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

    invites.forEach((invite) => {
        const inviter = invite.inviter;

        if (inviter) {
            const inviterId = inviter.id;
            const inviteCount = (invite.uses !== null ? invite.uses : 0);

            // Increment the invite count for the inviter
            inviteData[inviterId] = (inviteData[inviterId] || 0) + inviteCount;
        }
    });


    // Update the user invite counts in your database
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


        const rolesToAssign = [
            { role: guild.roles.cache.get('1153789870582550598'), minInviteCount: 0, maxInviteCount: 2 },
            { role: guild.roles.cache.get('1153796740072349726'), minInviteCount: 3, maxInviteCount: 4 },
            { role: guild.roles.cache.get('1153992358212423730'), minInviteCount: 5, maxInviteCount: Infinity },
        ];

        for (const { role, minInviteCount, maxInviteCount } of rolesToAssign) {
            if (role) { // Check if role is defined (not undefined)
                if (inviteCount >= minInviteCount && inviteCount <= maxInviteCount) {
                    assignRoleIfQualified(role, userId, guild);
                    break; // Stop after assigning the highest matching role
                }
            } else {
                console.error(`Role not found for user ${userId}`);
            }
        }

    }
}

async function assignRoleIfQualified(role: Role, userId: any, guild: Guild) {
    const member = await guild.members.fetch(userId);
    if (member) {
        if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role).catch(console.error);
        }
    } else {
        console.error('Member not found');
    }
}
/*
async function removeRoles(userId: any, rolesToRemove: any, guild: Guild) {
    const member = await guild.members.fetch(userId);
    if (member) {
        for (const role of rolesToRemove) {
            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role).catch(console.error);
            }
        }
    } else {
        console.error('Member not found');
    }
}*/

const job = new cron.CronJob('0 * * * * *', trackInvites); // checks for invites every minute
job.start();