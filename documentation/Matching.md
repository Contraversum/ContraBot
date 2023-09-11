# Documentation: Contrabot Matching Algorithm

## Overview: 

The Contrabot matching algorithm seeks to find users whose responses are most opposite to each other. This is achieved by comparing each user's set of responses to all other users in the database. The primary idea is that by matching users with the most diverse opinions, the platform can facilitate more meaningful and varied discussions.

## Methodology:

1. **Retrieve All Users:** The function initially fetches all user data from the users collection of the database.
2. **User Response Verification:** Before processing, the function ensures that the user's responses are present and are of the correct format.
3. **User Iteration:** The function iterates over all users in the database. For each user:
- It skips the current user itself (as we don't want to match a user with themselves).
- It checks for the presence and correctness of the user's set of responses, known as `userVector` in the database. If it's missing or incorrect, the function skips that user.
- A ~differenceScore` is calculated by multiplying the current user's responses with each of the other users' responses and summing them up. The `differenceScore` represents how opposite the user's responses are.
4. **Identifying the Most Opposite User:** The user with the lowest difference score is considered the most opposite user.
5. **Return Result:** The function returns the username of the most opposite user. If no match is found, it returns null.

## Algorithm:

The matching function:

**test-command.ts**

```typescript
async function findMatchingUser(userId: string, userResponses: number[]): Promise<string | null> {
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

        let mostOppositeUser: { userId: string, username: string } | null = null;
        let lowestDifferenceScore = Infinity;  // Initialize to a high value

        for (const user of users) {
            if (user.userId === userId) {
                console.log("Skipped: same userId as input userId");
                continue;
            }

            if (!Array.isArray(user.userVector) || user.userVector.length === 0) {
                console.log(`Skipped: Missing or invalid userVector for userId ${user.userId}`);
                continue;
            }

            // Calculate the difference score
            const differenceScore = userResponses.reduce((acc, value, index) => {
                // Multiply corresponding elements and sum them up
                return acc + value * user.userVector[index];
            }, 0);

            // Update the most opposite user if the difference score is lower than the lowest seen so far
            if (differenceScore < lowestDifferenceScore) {
                lowestDifferenceScore = differenceScore;
                mostOppositeUser = { userId: user.userId, username: user.username };
            }
        }

        return mostOppositeUser?.username || null;
    } catch (error) {
        console.error("Error in findMatchingUser: ", error);
        return null;
    }
}
```

### Example:

Consider the following example:
We have Vector A: (-1, -1, -1 , 1, 1, 1) and Vector B: (1, 1, 1, -1, -1, -1) and we want to calculate the difference score between them.
The difference score is calculated by multiplying (-1 * 1) + (-1 * 1) + (-1 * 1) + (1 * -1) + (1 * -1) + (1 * -1) = -6. This means that the difference score between Vector A and Vector B is -6. This is the lowest possible difference score. This means that Vector A and Vector B are the most opposite vectors possible. This is the desired result.

### How the Function is Called:
Once the user completes their test, the bot thanks the user and proceeds to find their best match using the findMatchingUser function. It then informs the user about their best match.

**test-command.ts**

```typescript
else {
    interaction.user.send("Danke, dass du den Test ausgefüllt hast! Dein Gesprächspartner wird dir zugesendet werden.");
    const bestMatch = await findMatchingUser(interaction.user.id, userResponses);

    if (bestMatch) {
        interaction.user.send(`Dein bester Gesprächspartner ist: **${bestMatch}**.`);
    }
    else {
        console.warn('No best match found');
    }        
    verifyUser(interaction);

    // Reset user's current question index in the database
    await db.db('contrabot').collection("users").updateOne(
        { userId: interaction.user.id },
        {
            $set: {
                currentQuestionIndex: 0,  // Reset to first question
            }
        }
    );
}
```

## Conclusion:
The Contrabot matching algorithm is a simple yet effective means of pairing users with diverse opinions. By ensuring that users are exposed to varied viewpoints, the platform hopes to facilitate richer interactions and discussions.