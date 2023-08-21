import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const questions = [
'Auf allen Autobahnen soll ein generelles Tempolimit gelten',
'Deutschland soll seine Verteidigungsausgaben erhöhen',
// 'Bei Bundestagswahlen sollen auch Jugendliche ab 16 Jahren wählen dürfen',
// 'Die Förderung von Windenenergie soll beendet werden?',
// 'Die Möglichkeiten der Vermieterinnen und Vermieter, Wohnungsmieten zu erhöhen, sollen gesetzlich stärker begrenzt werden.',
// 'Impfstoffe gegen Covid - 19 sollen weiterhin durch Patente geschützt sein.',
// 'Der für das Jahr 2038 geplante Ausstieg aus der Kohleverstromung soll vorgezogen werden.',
// 'Alle Erwerbstätigen sollen in der gesetzlichen Rentenversicherung versichert sein müssen.',
// 'Das Recht anerkannter Flüchtlinge auf Familiennachzug soll abgeschafft werden.',
// 'Auf den Umsatz, der in Deutschland mit digitalen Dienstleistungen erzielt wird, soll eine nationale Steuer erhoben werden.',
// 'Die traditionelle Familie aus Vater, Mutter und Kindern soll stärker als andere Lebensgemeinschaften gefördert werden.',
// 'Spenden von Unternehmen an Parteien sollen weiterhin erlaubt sein.',
// 'Studentinnen und Studenten sollen BAföG unabhängig vom Einkommen ihrer Eltern erhalten.',
// 'In Deutschland soll es generell möglich sein, neben der deutschen eine zweite Staatsbürgerschaft zu haben.',
// 'Bundesbehörden sollen in ihren Veröffentlichungen unterschiedliche Geschlechtsidentitäten sprachlich berücksichtigen',
// 'Die Ostsee - Pipeline „Nord Stream2“, die Gas von Russland nach Deutschland transportiert, soll wie geplant in Betrieb gehen dürfen.',
// 'Der Solidaritätszuschlag soll vollständig abgeschafft werden.',
// 'Das Tragen eines Kopftuchs soll Beamtinnen im Dienst generell erlaubt sein.',
// 'Die Zulassung von neuen Autos mit Verbrennungsmotor soll auch langfristig möglich sein.',
// 'Der Bund soll mehr Zuständigkeiten in der Schulpolitik erhalten.',
// 'Der Bund soll Projekte zur Bekämpfung des Antisemitismus stärker finanziell unterstützen.',
// 'Chinesische Firmen sollen keine Aufträge für den Ausbau der Kommunikationsinfrastruktur in Deutschland erhalten dürfen.',
// 'Der Staat soll weiterhin für Religionsgemeinschaften die Kirchensteuer einziehen.',
// 'Der kontrollierte Verkauf von Cannabis soll generell erlaubt sein.',
// 'Deutschland soll aus der Europäischen Union austreten.',
// 'Die Landeslisten der Parteien für die Wahlen zum Deutschen Bundestag sollen abwechselnd mit Frauen und Männern besetzt werden müssen.',
// 'Stationäre Behandlungen im Krankenhaus sollen weiterhin über eine Fallpauschale abgerechnet werden.',
// 'Auf hohe Vermögen soll wieder eine Steuer erhoben werden.',
// 'Bei der Videoüberwachung öffentlicher Plätze soll Gesichtserkennungssoftware eingesetzt werden dürfen.',
// 'Auch Ehepaare ohne Kinder sollen weiterhin steuerlich begünstigt werden.',
// 'Ökologische Landwirtschaft soll stärker gefördert werden als konventionelle Landwirtschaft.',
// 'Islamische Verbände sollen als Religionsgemeinschaften staatlich anerkannt werden können.',
// 'Der staatlich festgelegte Preis für den Ausstoß von CO2 beim Heizen und Autofahren soll stärker steigen als geplant.',
// 'Die Schuldenbremse im Grundgesetz soll beibehalten werden.',
// 'Asyl soll weiterhin nur politisch Verfolgten gewährt werden.',
// 'Der gesetzliche Mindestlohn soll spätestens im Jahr 2022 auf mindestens 12 Euro erhöht werden.',
// 'Der Flugverkehr soll höher besteuert werden.',
'Unternehmen sollen selbst entscheiden, ob sie ihren Beschäftigten das Arbeiten im Homeoffice erlauben.',
];

let currentQuestionIndex = 0; 
let userResponses: number[] = [];

const sendQuestion = (interaction: any) => {
    if (currentQuestionIndex < questions.length) {
        const embed = new EmbedBuilder()
            .setTitle("Frage:")
            .setDescription(questions[currentQuestionIndex])
            .setColor('#f55a00');

        const builder = new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setCustomId(`agree`)
                .setStyle(ButtonStyle.Success)
                .setEmoji("👍"),
            new ButtonBuilder()
                .setCustomId(`disagree`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji("👎"),
            new ButtonBuilder()
                .setCustomId(`neutral`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("😐"),
        ]);

        interaction.user.send({
            embeds: [embed],
            components: [builder]
        });

        currentQuestionIndex++; // Move to the next question
    } else {
        interaction.user.send("Thank you for answering all the questions!");
        console.log(userResponses);
        const userVector = userResponses;
    }
}

export const data = new SlashCommandBuilder().setName('test').setDescription('Asks the test questions!');
export const execute = async (interaction: any) => {
    await interaction.reply({
        content: 'Deine Meinung ist gefragt! Bitte kommentiere die folgenden These mit 👍, 👎 oder 😐. Test wurde gestartet.\nBitte schaue in deinen Direktnachrichten nach :)',
        ephemeral: true,
    });
    sendQuestion(interaction);
};

export { sendQuestion };
export { userResponses };
