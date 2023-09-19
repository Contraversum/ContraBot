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

        const inviteCount = inviteData[userId] || 0;

        // Update the invite count for the user in the database
        await db.db('contrabot').collection('users').updateOne(
            { userId: userId },
            { $set: { inviteCount: inviteCount } }
        );

        // Role assignment logic here based on inviteCount
        const role1: Role | undefined = guild.roles.cache.get('1153789870582550598');
        const role2: Role | undefined = guild.roles.cache.get('1153796740072349726');

        if (inviteCount == 2 && role1) {
            const member = await guild.members.fetch(userId);
            if (member) {
                await member.roles.add(role1).catch(console.error);
            } else {
                console.error('Member not found');
            }
        }
        else if (inviteCount > 2 && role2) {
            const member = await guild.members.fetch(userId);
            if (member) {
                await member.roles.add(role2).catch(console.error);
            } else {
                console.error('Member not found');
            }
        }
    }
}

const job = new cron.CronJob('0 * * * * *', trackInvites); // checks for invites every minute
job.start();