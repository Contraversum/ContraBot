import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const question = (interaction: any) => {
    const embed = new EmbedBuilder()
        .setTitle("Fragen")
        .setDescription("👍: Ich stimme zu\n🤩: Ich stimme zu (doppelt gewichtet)\n👎: Ich stimme nicht zu\n🤢: Ich stimme nicht zu (doppelt gewichtet)\n➖: Ist mir egal!")
        .setFooter({ text: "Provided by Contraversum", iconURL: "https://cdn.sstatic.net/Img/teams/teams-illo-free-sidebar-promo.svg?v=47faa659a05e" }) //TODO: Add Contraversum logo
        .setColor('#f55a00') //TODO: Do we have a brand color? If so, use it here

    const builder = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
            .setCustomId(`like`)
            .setStyle(ButtonStyle.Success)
            .setEmoji("👍"),
        new ButtonBuilder()
            .setCustomId(`like_twice`)
            .setStyle(ButtonStyle.Success)
            .setEmoji("🤩"),
        new ButtonBuilder()
            .setCustomId(`dislike`)
            .setStyle(ButtonStyle.Danger)
            .setEmoji("👎"),
        new ButtonBuilder()
            .setCustomId(`dislike_twice`)
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🤢"),
        new ButtonBuilder()
            .setCustomId(`neutral`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("➖"),
    ])

    interaction.user.send({
        embeds: [ embed ],
        components: [ builder ]
    })
}

module.exports = {
    data: new SlashCommandBuilder().setName('test').setDescription('Asks the test questions!'),
    async execute(interaction: any) {
        await interaction.reply({
            content: 'Test gestartet.\nBitte beantworte die Fragen des Bots in den Direktnachrichten.',
            ephemeral: true,
        });
        question(interaction);
    },
};
