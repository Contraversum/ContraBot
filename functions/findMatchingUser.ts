import { Guild } from 'discord.js';
import { db } from '../common';

async function findMatchingUser(userId: string, userResponses: number[], guild: Guild): Promise<{ userId: string, username: string, userVector: number[], GuildMember: any } | null> {

    if (!userId || !Array.isArray(userResponses) || userResponses.length === 0) {
        console.log("Invalid input parameters");
        return null;
    }

    try {
        const users = await db.db('contrabot').collection("users").find({}).toArray();

        if (!Array.isArray(users)) {
            console.error("Error retrieving users from database");
            return null;
        }

        let mostOppositeUser: { userId: string, username: string, userVector: number[], GuildMember: any } | null = null;
        let lowestDifferenceScore = Infinity;

        for (const user of users) {
            if (user.userId === userId) {
                console.log("Skipped: same userId as input userId");
                continue;
            }

            if (!Array.isArray(user.userVector) || user.userVector.length === 0) {
                console.log(`Skipped: Missing or invalid userVector for userId ${user.userId}`);
                continue;
            }

            const differenceScore = userResponses.reduce((acc, value, index) => {
                return acc + value * user.userVector[index];
            }, 0);

            if (differenceScore < lowestDifferenceScore) {
                lowestDifferenceScore = differenceScore;
                mostOppositeUser = { userId: user.userId, username: user.username, userVector: user.userVector, GuildMember: null };
            }
        }

        if (mostOppositeUser) {
            const isMember = await guild.members.fetch(mostOppositeUser.userId).then(() => true).catch(() => false);
            if (!isMember) {
                await db.db('contrabot').collection("users").deleteOne({ userId: mostOppositeUser.userId });
                console.log(`Deleted: userId ${mostOppositeUser.userId} is no longer on the server.`);
                return await findMatchingUser(userId, userResponses, guild); // Recursive call if the best match isn't a server member
            }
        }

        return mostOppositeUser || null;

    } catch (error) {
        console.error("Error in findMatchingUser: ", error);
        return null;
    }
}

export default findMatchingUser;
