import { EmbedBuilder } from 'discord.js';
import questions from '../questions';

async function conversationStarter(channelOfDestination: any, interaction: any, bestMatch: number[], user: number[]) {

    // get all contrasting and similar answers
    let addedToDisagree = false; // Track if any numbers were added to disagree
    const disagree: number[] = [];

    user.forEach((value, i) => {
        const total = value + bestMatch[i];
        if (value !== 0 && total === 0) {
            disagree.push(i);
            addedToDisagree = true;
        }
    });
    // Only add to disagree if the flag is still false
    if (!addedToDisagree || disagree.length < 6) {
        user.forEach((value, i) => {
            const total = value + bestMatch[i];
            if (Math.abs(total) === 1) {
                disagree.push(i);
            }
        });
    }

    const selectedIndexes = getRandomDisagreement(disagree, 6);
    sendDisagreedQuestions(channelOfDestination, selectedIndexes.slice(0, 3));
}

function getRandomDisagreement(arr: number[], num: number) {
    return Array.from({ length: Math.min(num, arr.length) }, () => arr.splice(Math.floor(Math.random() * arr.length), 1)[0]);
}

function sendDisagreedQuestions(channelOfDestination: any, disagree: number[]) {
    disagree.forEach((value) => {
        channelOfDestination.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Frage: ${value + 1}/38`)
                    .setDescription(questions[value].question)
                    .setColor('#fb2364')
            ]
        });
    });

    // Make it so that the tags of the questions are printed properly
    const selectedTags = disagree
        .map(index => questions[index].tag)
        .filter(tag => tag)
        .slice(0, 3);

    const topicsMessage = `Als Gesprächsthemen können z.B. ${selectedTags.map(tag => `**${tag}**`).join(", ")} besprochen werden.`;
    channelOfDestination.send(topicsMessage);
}

export default conversationStarter;
