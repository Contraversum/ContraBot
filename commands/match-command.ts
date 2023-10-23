import { db } from '../common';
import 'dotenv/config';
import { questions } from '../questions';
import { sendQuestion } from './test-command';
import { ChatInputCommandInteraction } from "discord.js";

export async function executeMatch(interaction: ChatInputCommandInteraction) {

    const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });

    const userResponses = userContext?.userVector || [];

    // checks if the user has answered the test
    // if not, an error hint is displayed
    if (userResponses.length === questions.length) {
        await interaction.reply({
            content: 'Neues Match wird ermittelt. Bitte schaue in deinen Direktnachrichten nach :)',
            ephemeral: true,
        });
        sendQuestion(interaction);
    } else {
        await interaction.reply({
            content: 'Bitte beantworte den Meinungstest vollständig, bevor du mit Anderen gematcht werden kannst! Bitte nutze dazu den Befehl `/test`.',
            ephemeral: true,
        });
        console.log('Invalid userVector: test was not completed!');
    }
};
