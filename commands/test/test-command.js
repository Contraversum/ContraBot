const { SlashCommandBuilder } = require('discord.js');

const question = (interaction, str) =>
  interaction.user.send(str).then((sentMessage) => {
    // pre-set reactions by the bot
    sentMessage.react('👍');
    sentMessage.react('🤩');
    sentMessage.react('🤩');
    sentMessage.react('👎');
    sentMessage.react('🤢');
    sentMessage.react('➖');
  });

module.exports = {
  data: new SlashCommandBuilder().setName('test').setDescription('Asks the test questions!'),
  async execute(interaction) {
    await interaction.reply({
      content: 'Test gestartet.\nBitte beantworte die Fragen des Bots in den Direktnachrichten.',
      ephemeral: true,
    });
    await interaction.user.send(
      'Bitte beantworte alle Fragen.\n👍: Ich stimme zu\n🤩: Ich stimme zu (doppelt gewichtet)\n👎: Ich stimme nicht zu\n🤢: Ich stimme nicht zu (doppelt gewichtet)\n➖: Ist mir egal!\nTestfragen:'
    );
    await question(interaction, 'Hi!');
  },
};
