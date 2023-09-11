import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role } from 'discord.js';
import { client, db } from '../../index';

const questions = [
    { question: 'Auf allen Autobahnen soll ein generelles Tempolimit gelten.', tag: ['Verkehrssicherheit', ' Klimawandel'] },
    { question: 'Deutschland soll seine Verteidigungsausgaben erhöhen.', tag: 'Verteidigungspolitik' },
    { question: 'Bei Bundestagswahlen sollen auch Jugendliche ab 16 Jahren wählen dürfen.', tag: ['Wahlalter', 'Demokratie'] },
    { question: 'Die Förderung von Windenenergie soll beendet werden?', tag: ['Energiepolitik', 'Klimawandel'] },/*
    { question: 'Die Möglichkeiten der Vermieterinnen und Vermieter, Wohnungsmieten zu erhöhen, sollen gesetzlich stärker begrenzt werden.', tag: ['Mietpreisbremse', 'Wohnraumkosten'] },
    { question: 'Die Ukraine soll Mitglied der Europäischen Union werden dürfen.', tag: ['EU-Erweiterung', 'Ukraine Krieg'] },
    { question: 'Der geplante Ausstieg aus der Kohleverstromung soll vorgezogen werden.', tag: ['Energiepolitik', 'Umweltschutz'] },
    { question: 'Alle Erwerbstätigen sollen in der gesetzlichen Rentenversicherung versichert sein müssen.', tag: 'Sozialpolitik' },
    { question: 'Das Recht anerkannter Flüchtlinge auf Familiennachzug soll abgeschafft werden.', tag: 'Migrationspolitik' },
    { question: 'Auf den Umsatz, der in Deutschland mit digitalen Dienstleistungen erzielt wird, soll eine nationale Steuer erhoben werden.', tag: 'Steuerpolitik' },
    { question: 'Die traditionelle Familie aus Vater, Mutter und Kindern soll stärker als andere Lebensgemeinschaften gefördert werden.', tag: 'Familienpolitik' },
    { question: 'Spenden von Unternehmen an Parteien sollen weiterhin erlaubt sein.', tag: 'Parteienfinanzierung' },
    { question: 'Migration in die Europäische Union sollte erleichtert werden.', tag: 'Migrationspolitik' },
    { question: 'Studentinnen und Studenten sollen BAföG unabhängig vom Einkommen ihrer Eltern erhalten.', tag: 'Bildungspolitik' },
    { question: 'In Deutschland soll es generell möglich sein, neben der deutschen eine zweite Staatsbürgerschaft zu haben.', tag: ['Staatsbürgerschaft', 'Migrationspolitik'] },
    { question: 'Bundesbehörden sollen in ihren Veröffentlichungen unterschiedliche Geschlechtsidentitäten sprachlich berücksichtigen müssen.', tag: ['Genderpolitik', 'Minderheitenpolitik'] },
    { question: 'Der Solidaritätszuschlag soll vollständig abgeschafft werden.', tag: ['Steuerpolitik', 'Solidaritätszuschlag'] },
    { question: 'Das Tragen eines Kopftuchs soll Beamtinnen im Dienst generell erlaubt sein.', tag: ['Religionsfreiheit', 'Minderheitenpolitik'] },
    { question: 'Die Zulassung von neuen Autos mit Verbrennungsmotor soll auch langfristig möglich sein.', tag: 'Klimawandel' },
    { question: 'Der Bund soll mehr Zuständigkeiten in der Schulpolitik erhalten.', tag: 'Bildungspolitik' },
    { question: 'Der Bund soll Projekte zur Bekämpfung des Antisemitismus stärker finanziell unterstützen.', tag: ['Antisemitismus', 'Minderheitenpolitik'] },
    { question: 'Chinesische Firmen sollen keine Aufträge für den Ausbau der Kommunikationsinfrastruktur in Deutschland erhalten dürfen.', tag: 'Wirtschaftspolitik' },
    { question: 'Der Staat soll weiterhin für Religionsgemeinschaften die Kirchensteuer einziehen.', tag: 'Kirchensteuer' },
    { question: 'Der kontrollierte Verkauf von Cannabis soll generell erlaubt sein.', tag: 'Drogenpolitik' },
    { question: 'Deutschland soll aus der Europäischen Union austreten.', tag: 'EU-Politik' },
    { question: 'Die Landeslisten der Parteien für die Wahlen zum Deutschen Bundestag sollen abwechselnd mit Frauen und Männern besetzt werden müssen.', tag: ['Geschlechtergerechtigkeit', 'Minderheitenpolitik'] },
    { question: 'Stationäre Behandlungen im Krankenhaus sollen weiterhin über eine Fallpauschale abgerechnet werden.', tag: 'Gesundheitspolitik' },
    { question: 'Auf hohe Vermögen soll wieder eine Steuer erhoben werden.', tag: ['Steuerpolitik', 'Vermögenssteuer'] },
    { question: 'Bei der Videoüberwachung öffentlicher Plätze soll Gesichtserkennungssoftware eingesetzt werden dürfen.', tag: ['Datenschutz', 'Videoüberwachung'] },
    { question: 'Auch Ehepaare ohne Kinder sollen weiterhin steuerlich begünstigt werden.', tag: 'Familienpolitik' },
    { question: 'Ökologische Landwirtschaft soll stärker gefördert werden als konventionelle Landwirtschaft.', tag: 'Klimawandel' },
    { question: 'Islamische Verbände sollen als Religionsgemeinschaften staatlich anerkannt werden können.', tag: ['Religionspolitik', 'Minderheitenpolitik'] },
    { question: 'Der staatlich festgelegte Preis für den Ausstoß von CO2 beim Heizen und Autofahren soll stärker steigen als geplant.', tag: ['Klimaschutz', 'Klimawandel'] },
    { question: 'Die Schuldenbremse im Grundgesetz soll beibehalten werden.', tag: 'Wirtschaftspolitik' },
    { question: 'Asyl soll weiterhin nur politisch Verfolgten gewährt werden.', tag: 'Migrationspolitik' },
    { question: 'Der gesetzliche Mindestlohn sollte erhöht werden.', tag: 'Sozialpolitik' },
    { question: 'Der Flugverkehr soll höher besteuert werden.', tag: ['Flugverkehr', 'Klimapolitik'] },
    { question: 'Unternehmen sollen selbst entscheiden, ob sie ihren Beschäftigten das Arbeiten im Homeoffice erlauben.', tag: ['Arbeitsrecht', 'Digitalisierung'] },*/
];

const sendQuestion = async (interaction: any) => {

    const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });

    let currentQuestionIndex = userContext?.currentQuestionIndex || 0;
    let userResponses = userContext?.userVector || [];
    var currentQuestionDisplay = currentQuestionIndex + 1

    if (currentQuestionIndex === 0) {
        userResponses = [];
    }

    if (currentQuestionIndex < questions.length) {
        const embed = new EmbedBuilder()
            .setTitle("Frage: " + currentQuestionDisplay + "/38")
            .setDescription(questions[currentQuestionIndex].question)
            .setColor('#fb2364');

        const builder = new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder()
                .setCustomId(`agree`)
                .setStyle(ButtonStyle.Success)
                .setEmoji("👍"),
            new ButtonBuilder()
                .setCustomId(`neutral`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("😐"),
            new ButtonBuilder()
                .setCustomId(`disagree`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji("👎"),
        ]);

        interaction.user.send({
            embeds: [embed],
            components: [builder]
        });

        // Update context for this user in the database
        await db.db('contrabot').collection("users").updateOne(
            { userId: interaction.user.id },
            {
                $set: {
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    currentQuestionIndex: currentQuestionIndex + 1,
                    userVector: userResponses
                }
            },
            { upsert: true }
        );
    } else {
        console.log(userResponses);
        console.log(interaction.user.id);

        const bestMatch = await findMatchingUser(interaction.user.id, userResponses);

        if (bestMatch) {
            interaction.user.send(`Dein bester Gesprächspartner ist: **@${bestMatch.username}**.`);
            interaction.user.send("Als nächstes schreibst du deinem Partner, indem du auf seinen Namen auf dem Contraversum-Server klickst 👆 und ihm eine Nachricht sendest.");
            interaction.user.send("Dies sind drei Fragen bei denen ihr euch unterscheidet:");
            conversationStarter(interaction, bestMatch.userVector, userResponses);

            // Send the best match that they have been matched with the user
            const bestMatchUser = await client.users.fetch(bestMatch.userId);
            if (bestMatchUser) {
                bestMatchUser.send(`Hey 👋, du wurdest mit: **@${interaction.user.username}** gematched.`);
            }
        }
        else {
            console.warn('No best match found');
            interaction.user.send("Leider konnte zur Zeit kein geeigneter Gesprächspartner gefunden werden. Bitte versuchen Sie es später erneut.");
        }


        verifyUser(interaction);

        // Reset context for this user in the database
        await db.db('contrabot').collection("users").updateOne(
            { userId: interaction.user.id },
            {
                $set: {
                    currentQuestionIndex: 0,  // Reset to first question
                }
            }
        );
    }
}




async function conversationStarter(interaction: any, bestMatch: number[], user: number[]) {

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
    if (!addedToDisagree) {
        user.forEach((value, i) => {
            const total = value + bestMatch[i];
            if (Math.abs(total) === 1) {
                disagree.push(i);
            }
        });
    }

    // selects 3 random disagreements and prints them
    function getRandomDisagreement(arr: number[], num: number) {
        return Array.from({ length: Math.min(num, arr.length) }, () => arr.splice(Math.floor(Math.random() * arr.length), 1)[0]);
    }
    const selectedIndexes = getRandomDisagreement(disagree, 3)
    selectedIndexes.forEach((value) => {
        interaction.user.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Frage: ${value + 1}/38`)
                    .setDescription(questions[value].question)
                    .setColor('#fb2364')
            ]
        });
    });

    // Make it so that the tags of the questions are printed properly
    const selectedTags = selectedIndexes
        .map(index => questions[index].tag)
        .filter(tag => tag)
        .slice(0, 3);

    const topicsMessage = `Als Gesprächsthemen können z.B. ${selectedTags.map(tag => `**${tag}**`).join(", ")} besprochen werden.`;
    interaction.user.send(topicsMessage);
}


async function findMatchingUser(userId: string, userResponses: number[]): Promise<{ userId: string, username: string, userVector: number[] } | null> {
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

        let mostOppositeUser: { userId: string, username: string, userVector: number[] } | null = null;
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
                mostOppositeUser = { userId: user.userId, username: user.username, userVector: user.userVector };
            }
        }

        return mostOppositeUser || null;
    } catch (error) {
        console.error("Error in findMatchingUser: ", error);
        return null;
    }
}

function verifyUser(interaction: any) {
    const guild: Guild | undefined = client.guilds.cache.get('1131613084553859182');
    if (!guild) {
        console.error('Guild not found');
        return;
    }
    const role: Role | undefined = guild.roles.cache.get('1143590879274213486');
    if (!role) {
        console.error('Role not found');
        return;
    }
    const member = guild.members.cache.get(interaction.user.id);
    if (!member) {
        console.error('Member not found');
        return;
    }
    member.roles.add(role).catch(console.error);
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
