import { db } from '../common';
import 'dotenv/config';
import { questions } from '../questions';
import { initiateConversation, sendQuestion } from './test-command';
import { decrypt } from '../encryptionUtils';
import { ChatInputCommandInteraction } from "discord.js";

export async function executeMatch(interaction: ChatInputCommandInteraction) {

    const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });
    const userResponses = userContext?.userVector ? JSON.parse(decrypt(userContext.userVector)) : [];

    // checks if the user has answered the test
    // if not, an error hint is displayed
    if (userResponses.length === questions.length) {
        await interaction.reply({
            content: 'Neues Match wird ermittelt. Bitte schaue in deinen Direktnachrichten nach :)',
            ephemeral: true,
        });

        initiateConversation(interaction, userResponses);
    } else {
        await interaction.reply({
            content: 'Bitte beantworte den Meinungstest vollständig, bevor du mit Anderen gematcht werden kannst! Bitte nutze dazu den Befehl `/test`.',
            ephemeral: true,
        });
        sendQuestion(interaction);
        console.log('Invalid userVector: test was not completed!');
    }
};
