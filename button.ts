const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMemberRoleManager } = require('discord.js');
const { client, db } = require('./index');
/*
module.exports = {
    data: new SlashCommandBuilder()
        .setName('buttontest')
        .setDescription('never expiring button'),
    async execute(interaction: any) { // Correct the typo from 'excecute' to 'execute'
        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('expirebutton')
                    .setLabel('Button Testing')
                    .setStyle(ButtonStyle.PRIMARY) // Use uppercase 'PRIMARY'
            );

        await interaction.reply({
            content: `Button Testing`, components: [button], ephemeral: true
        });
    }
}
*/

// Define the channel ID where you want to create the button
const targetChannelId = '1119231778209681450';

// Create the button and action row
const button = new ButtonBuilder()
    .setCustomId('expirebutton')
    .setLabel('Button Testing')
    .setStyle(ButtonStyle.PRIMARY);

const actionRow = {
    components: [button],
};

// Send the button to the target channel
const sendButton = async () => {
    const channel = await client.channels.fetch(targetChannelId);
    if (channel?.isText()) {
        await channel.send({ content: 'Button Testing', components: [actionRow] });
        console.log('Button sent to the channel.');
    } else {
        console.error('Invalid channel or unable to send the button.');
    }
};

// Call the function to send the button
sendButton();

// Button
client.on('interactionCreate', async (interaction: any) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'expirebutton') {
            await interaction.reply({ content: `Button Working`, ephemeral: true });
        }
    }
});