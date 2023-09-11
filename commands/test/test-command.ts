import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role } from 'discord.js';
import { client, db } from '../../index';

const questions = [
    //'Auf allen Autobahnen soll ein generelles Tempolimit gelten.',
    //'Deutschland soll seine Verteidigungsausgaben erhöhen.',
    //'Bei Bundestagswahlen sollen auch Jugendliche ab 16 Jahren wählen dürfen.',
    //'Die Förderung von Windenenergie soll beendet werden?',
    //'Die Möglichkeiten der Vermieterinnen und Vermieter, Wohnungsmieten zu erhöhen, sollen gesetzlich stärker begrenzt werden.',
    //'Die Ukraine soll Mitglied der Europäischen Union werden dürfen.',
    //'Der geplante Ausstieg aus der Kohleverstromung soll vorgezogen werden.',
    //'Alle Erwerbstätigen sollen in der gesetzlichen Rentenversicherung versichert sein müssen.',
    //'Das Recht anerkannter Flüchtlinge auf Familiennachzug soll abgeschafft werden.',
    //'Auf den Umsatz, der in Deutschland mit digitalen Dienstleistungen erzielt wird, soll eine nationale Steuer erhoben werden.',
    //'Die traditionelle Familie aus Vater, Mutter und Kindern soll stärker als andere Lebensgemeinschaften gefördert werden.',
    //'Spenden von Unternehmen an Parteien sollen weiterhin erlaubt sein.',
    //'Migration in die Europäische Union sollte erleichtert werden.',
    //'Studentinnen und Studenten sollen BAföG unabhängig vom Einkommen ihrer Eltern erhalten.',
    //'In Deutschland soll es generell möglich sein, neben der deutschen eine zweite Staatsbürgerschaft zu haben.',
    //'Bundesbehörden sollen in ihren Veröffentlichungen unterschiedliche Geschlechtsidentitäten sprachlich berücksichtigen müssen.',
    //'Der Solidaritätszuschlag soll vollständig abgeschafft werden.',
    //Das Tragen eines Kopftuchs soll Beamtinnen im Dienst generell erlaubt sein.',
    //'Die Zulassung von neuen Autos mit Verbrennungsmotor soll auch langfristig möglich sein.',
    //'Der Bund soll mehr Zuständigkeiten in der Schulpolitik erhalten.',
    //'Der Bund soll Projekte zur Bekämpfung des Antisemitismus stärker finanziell unterstützen.',
    //'Chinesische Firmen sollen keine Aufträge für den Ausbau der Kommunikationsinfrastruktur in Deutschland erhalten dürfen.',
    //'Der Staat soll weiterhin für Religionsgemeinschaften die Kirchensteuer einziehen.',
    //'Der kontrollierte Verkauf von Cannabis soll generell erlaubt sein.',
   // 'Deutschland soll aus der Europäischen Union austreten.',
   // 'Die Landeslisten der Parteien für die Wahlen zum Deutschen Bundestag sollen abwechselnd mit Frauen und Männern besetzt werden müssen.',
   // 'Stationäre Behandlungen im Krankenhaus sollen weiterhin über eine Fallpauschale abgerechnet werden.',
   // 'Auf hohe Vermögen soll wieder eine Steuer erhoben werden.',
   // 'Bei der Videoüberwachung öffentlicher Plätze soll Gesichtserkennungssoftware eingesetzt werden dürfen.',
   // 'Auch Ehepaare ohne Kinder sollen weiterhin steuerlich begünstigt werden.',
   // 'Ökologische Landwirtschaft soll stärker gefördert werden als konventionelle Landwirtschaft.',
   // 'Islamische Verbände sollen als Religionsgemeinschaften staatlich anerkannt werden können.',
   // 'Der staatlich festgelegte Preis für den Ausstoß von CO2 beim Heizen und Autofahren soll stärker steigen als geplant.',
    //'Die Schuldenbremse im Grundgesetz soll beibehalten werden.',
    'Asyl soll weiterhin nur politisch Verfolgten gewährt werden.',
    'Der gesetzliche Mindestlohn sollte erhöht werden.',
    'Der Flugverkehr soll höher besteuert werden.',
    'Unternehmen sollen selbst entscheiden, ob sie ihren Beschäftigten das Arbeiten im Homeoffice erlauben.',
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
            .setDescription(questions[ currentQuestionIndex ])
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
            embeds: [ embed ],
            components: [ builder ]
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
        interaction.user.send("Danke, dass du den Test ausgefüllt hast! Dein Gesprächspartner wird dir zugesendet werden.");
        console.log(userResponses);
        console.log(interaction.user.id);

        const bestMatch = await findMatchingUser(interaction.user.id, userResponses);

        if (bestMatch) {
            interaction.user.send(`Dein bester Gesprächspartner ist: **${bestMatch.username}**.`);

            // Send the best match that they have been matched with the user
            const bestMatchUser = await client.users.fetch(bestMatch.userId);
            if (bestMatchUser) {
                bestMatchUser.send(`Hey 👋, du wurdest mit: **@${interaction.user.username}** gematched.`);
            }
        }
        else {
            console.warn('No best match found');
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

async function findMatchingUser(userId: string, userResponses: number[]): Promise<{ userId: string, username: string } | null> {
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

        let mostOppositeUser: { userId: string, username: string } | null = null;
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
                mostOppositeUser = { userId: user.userId, username: user.username };
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
