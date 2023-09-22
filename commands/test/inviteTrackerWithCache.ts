// This code does not work but can be used as a basis to change the invite tracker code


import { Guild, GuildMember, Role, Collection, Invite } from 'discord.js';
import { client, db } from '../../index';

// Define a variable to store cached invites
let cachedInvites: Collection<string, Invite> | null = null;
let inviteCodeToUserIdMap: Map<string, string> = new Map(); // Mapping between invite codes and user IDs

async function trackInvites(member: GuildMember) {
    console.log('Invite tracker is working!');

    const guild: Guild | undefined = client.guilds.cache.get('1119231777391788062');
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    // Initialize cachedInvites to an empty collection if it's null, so it checks all users
    if (!cachedInvites) {
        cachedInvites = new Collection();
    }
    // Fetch invites for the guild
    const invites = await guild.invites.fetch();

    // Check if invites are cached and compare with the new invites returns the invitecodes that have diffferences
    const differences = findInviteDifferences(cachedInvites, invites);
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
            inviteCodeToUserIdMap.set(invite.code, inviterId);
        }
    });

    // Update the user invite counts only for users related to the differences
    const users = await db.db('contrabot').collection('users').find({}).toArray();
    const usersToUpdate = users.filter((user) => differences.includes(inviteCodeToUserIdMap.get(user.userId) ?? ''));


    for (const user of usersToUpdate) {
        const userId = user.userId
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

        assignRoles(inviteCount, userId, guild);
    }

    cachedInvites = invites;
}

function findInviteDifferences(
    oldInvites: Collection<string, Invite> | null,
    newInvites: Collection<string, Invite>
): string[] {
    const differences: string[] = [];

    newInvites.forEach((newInvite, code) => {
        const oldInvite = oldInvites ? oldInvites.get(code) : null;

        // If there's no oldInvite or the uses are different, add to differences
        if (!oldInvite || newInvite.uses !== oldInvite.uses) {
            differences.push(code);
        }
    });

    return differences;
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

client.on('guildMemberAdd', (member) => {
    // This function will be executed whenever a new member joins a guild
    trackInvites(member);
});
