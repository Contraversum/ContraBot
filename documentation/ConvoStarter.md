# Documentation: Conversation Starter

## Overview

This one simple function simplifies the process of starting a conversation with
the user's best match. It randomly selects three mismatching responses and
presents them to the user along with their respective topics.

## Method

1. First, the data of the best match is taken to extract its `userVector`.
2. The individual values (1, 0 or -1) for each question are added together:

- If the values are equal to 0, this means that they are in disagreement and are
  therefore stored in the array **disagree**.
- If one value is 0, then there can be no disagreement, so these questions are
  ignored.
- If in fact there are no disagreeing questions, then only questions with a
  maximum of one 0 are considered.

3. **getRandomDisagreement** Three random disagreements will be chosen and later
   displayed to the user.
4. Finally, topics taken from the tags corresponding to the questions are
   displayed to the user in the same order and correspondence as the
   disagreements.

## The Function

**test-command.ts**

```typescript
async function conversationStarter(
  interaction: any,
  bestMatch: string,
  user: number[],
) {
  // get the data from bestMatch
  const match = await db.db("contrabot").collection("users").find().toArray();
  let matchVector: number[] = [];
  for (const user of match) {
    if (user.username === bestMatch) {
      console.log(user.userVector, user.username);
      matchVector = user.userVector;
    }
  }

  // get all contrasting and similar answers
  let addedToDisagree = false; // Track if any numbers were added to disagree
  const disagree: number[] = [];
  const agree: number[] = [];

  user.forEach((value, i) => {
    const total = value + matchVector[i];
    if (value !== 0 && matchVector[i] !== 0) {
      if (total === 0) {
        disagree.push(i);
        addedToDisagree = true; // Set the flag
      } else {
        agree.push(i);
      }
    }
  });
  // Only add to disagree if the flag is still false
  if (!addedToDisagree) {
    user.forEach((value, i) => {
      const total = value + matchVector[i];
      if (Math.abs(total) === 1) {
        disagree.push(i);
      }
    });
  }

  // selects 3 random disagreements and prints them
  function getRandomDisagreement(arr: number[], num: number) {
    return Array.from(
      { length: Math.min(num, arr.length) },
      () => arr.splice(Math.floor(Math.random() * arr.length), 1)[0],
    );
  }
  const selectedIndexes = getRandomDisagreement(disagree, 3);
  selectedIndexes.forEach((value) => {
    interaction.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Frage: ${value + 1}/38`)
          .setDescription(questions[value].question)
          .setColor("#fb2364"),
      ],
    });
  });

  // Make it so that the tags of the questions are printed properly
  const selectedTags = selectedIndexes
    .map((index) => questions[index].tag)
    .filter((tag) => tag)
    .slice(0, 3);

  const topicsMessage = `Als Gesprächsthemen können z.B. ${
    selectedTags.map((tag) => `**${tag}**`).join(", ")
  } besprochen werden.`;
  interaction.user.send(topicsMessage);
}
```

## Conclusion

As we can observe, this feature streamlines the process of initiating a
conversation by presenting a starting topic and conflicting concepts that offer
a brief glimpse into how the user's ideal match perceives things.
