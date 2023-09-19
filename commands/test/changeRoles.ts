import { Guild, Role } from 'discord.js';
import { client, db } from '../../index';
import cron from 'cron';

/*

const checkInvites = async () => {
    const users = await db.db('contrabot').collection("users").find({}).toArray();

    if (!Array.isArray(users)) {
        console.error("Error retrieving users from database");
        return null;
    }

    const REQUIRED_INVITES = 3;




    client.on('ready', () => {
        console.log(`Logged in as ${client.user?.tag}`);

        const guild: Guild | undefined = client.guilds.cache.get('1131613084553859182');
        if (!guild) {
            console.error('Guild not found');
            return;
        }

        const role: Role | undefined = guild.roles.cache.get('1151603003279802498');
        if (!role) {
            console.error('Role not found');
            return;
        }


        // Fetch the invites for the server
        guild.invites.fetch().then((invites) => {
            guild.members.cache.forEach((member) => {
                if (!member.user.bot) {
                    const userInvites = invites.filter((invite) => invite.inviter && invite.inviter.id === member.id);
                    const inviteCount = userInvites.reduce((total, invite) => total + (invite.uses || 0), 0);

                    if (inviteCount >= REQUIRED_INVITES && !member.roles.cache.has(role.id)) {
                        member.roles.add(role).catch(console.error);
                        console.log(`${member.displayName} has been assigned the role.`);
                    } else if (inviteCount < REQUIRED_INVITES && member.roles.cache.has(role.id)) {
                        member.roles.remove(role).catch(console.error);
                        console.log(`${member.displayName} no longer meets the invite requirements.`);
                    }
                }
            });
        });
    })
}


const job = new cron.CronJob('0 0 * * * *', checkInvites); // checks for invites every hour
job.start();





client.on('inviteCreate', async invite => {
    const invites = await invite.guild.invites.fetch();

    const codeUses = new Map();
    invites.each(inv => codeUses.set(inv.code, inv.uses));

    guildInvites.set(invite.guild.id, codeUses);
})

client.once('ready', () => {
    client.guilds.cache.forEach(guild => {
        guild.invites.fetch()
            .then(invites => {
                console.log("INVITES CACHED");
                const codeUses = new Map();
                invites.each(inv => codeUses.set(inv.code, inv.uses));

                guildInvites.set(guild.id, codeUses);
            })
            .catch(err => {
                console.log("OnReady Error:", err)
            })
    })
})

client.on('guildMemberAdd', async member => {
    const cachedInvites = guildInvites.get(member.guild.id)
    const newInvites = await member.guild.invites.fetch();
    try {
        const usedInvite = newInvites.find(inv => cachedInvites.get(inv.code) < inv.uses);
        console.log("Cached", [...cachedInvites.keys()])
        console.log("New", [...newInvites.values()].map(inv => inv.code))
        console.log("Used", usedInvite)
        console.log(`The code ${usedInvite.code} was just used by ${member.user.username}.`)
    } catch (err) {
        console.log("OnGuildMemberAdd Error:", err)
    }

    newInvites.each(inv => cachedInvites.set(inv.code, inv.uses));
    guildInvites.set(member.guild.id, cachedInvites);
});

*/

async function hi() {
    // Fetch users from the database
    const users = await db.db('contrabot').collection("users").find({}).toArray();

    // Get the guild and role
    const guild = client.guilds.cache.get('1131613084553859182');
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    const role = guild.roles.cache.get('1151603003279802498');
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

const job = new cron.CronJob('0 0 * * * *', hi); // checks for invites every hour
//job.start();