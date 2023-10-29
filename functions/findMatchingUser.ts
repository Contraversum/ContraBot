import { db } from '../common';
import { decrypt } from "../encryptionUtils";

export async function findMatchingUser(userId: string, userResponses: any[]): Promise<string | null> {
    if (userResponses.length === 0) {
        console.log("No User Responses");
        return null;
    }

    // Fetch users the current user has interacted with
    const conversations = await db.db('contrabot').collection("conversations").find({
        $or: [
            { interactionUserId: userId },
            { bestMatchUserId: userId }
        ]
    }).toArray();

    // Create a set of userIds that the current user has interacted with
    const interactedUserIds = new Set(conversations.map(conv => {
        return conv.interactionUserId === userId ? conv.bestMatchUserId : conv.interactionUserId;
    }));

    const users = await db.db('contrabot').collection("users").find().toArray();

    let mostOppositeUser: string | null = null;
    let lowestDifferenceScore = Infinity;

    for (const user of users) {
        if (user.userId === userId)
            continue;
        if (interactedUserIds.has(user.userId)) {
            console.log(`Skipped: userId ${user.userId} has already interacted with userId ${userId}`);
            continue;
        }

        let decryptedUserVector: number[]; // Explicit type declaration
        if (typeof user.userVector === 'string') { // Check if it's a string
            try {
                decryptedUserVector = JSON.parse(decrypt(user.userVector));
            } catch (error) {
                console.error(`Failed to decrypt userVector for userId ${user.userId}:`, error);
                continue;
            }
        } else {
            console.warn(`Skipped: userVector for userId ${user.userId} is not a string`);
            continue;
        }

        if (!Array.isArray(decryptedUserVector) || decryptedUserVector.length === 0) {
            console.log(`Skipped: Missing or invalid decrypted userVector for userId ${user.userId}`);
            continue;
        }

        const differenceScore = userResponses.reduce((acc, value, index) => {
            return acc + value * decryptedUserVector[index];
        }, 0);

        if (differenceScore < lowestDifferenceScore) {
            lowestDifferenceScore = differenceScore;
            mostOppositeUser = user.userId
        }
    }

    return mostOppositeUser;
}
