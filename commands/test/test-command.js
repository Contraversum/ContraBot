const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test')
		.setDescription('Asks the test questions!'),
	async execute(interaction) {
		await interaction.reply('💩');
	},
};
