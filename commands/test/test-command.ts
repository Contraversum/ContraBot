import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role } from 'discord.js';
import { client, db } from '../../index';
import { DateTime } from 'luxon';
import cron from 'cron';

const questions = [
    'Auf allen Autobahnen soll ein generelles Tempolimit gelten 1/38',
    'Deutschland soll seine Verteidigungsausgaben erhöhen 2/38',
    'Bei Bundestagswahlen sollen auch Jugendliche ab 16 Jahren wählen dürfen 3/38',
    //'Die Förderung von Windenenergie soll beendet werden? 4/38',
    //'Die Möglichkeiten der Vermieterinnen und Vermieter, Wohnungsmieten zu erhöhen, sollen gesetzlich stärker begrenzt werden. 5/38',
    //'Impfstoffe gegen Covid - 19 sollen weiterhin durch Patente geschützt sein. 6/38',
    //'Der für das Jahr 2038 geplante Ausstieg aus der Kohleverstromung soll vorgezogen werden. 7/38',
    // 'Alle Erwerbstätigen sollen in der gesetzlichen Rentenversicherung versichert sein müssen. 8/38',
    // 'Das Recht anerkannter Flüchtlinge auf Familiennachzug soll abgeschafft werden. 9/38',
    // 'Auf den Umsatz, der in Deutschland mit digitalen Dienstleistungen erzielt wird, soll eine nationale Steuer erhoben werden. 10/38',
    // 'Die traditionelle Familie aus Vater, Mutter und Kindern soll stärker als andere Lebensgemeinschaften gefördert werden. 11/38',
    // 'Spenden von Unternehmen an Parteien sollen weiterhin erlaubt sein. 12/38',
    // 'Studentinnen und Studenten sollen BAföG unabhängig vom Einkommen ihrer Eltern erhalten. 13/38',
    // 'In Deutschland soll es generell möglich sein, neben der deutschen eine zweite Staatsbürgerschaft zu haben. 14/38',
    // 'Bundesbehörden sollen in ihren Veröffentlichungen unterschiedliche Geschlechtsidentitäten sprachlich berücksichtigen müssen. 15/38',
    // 'Die Ostsee - Pipeline „Nord Stream2“, die Gas von Russland nach Deutschland transportiert, soll wie geplant in Betrieb gehen dürfen. 16/38',
    // 'Der Solidaritätszuschlag soll vollständig abgeschafft werden. 17/38',
    // 'Das Tragen eines Kopftuchs soll Beamtinnen im Dienst generell erlaubt sein. 18/38',
    // 'Die Zulassung von neuen Autos mit Verbrennungsmotor soll auch langfristig möglich sein. 19/38',
    // 'Der Bund soll mehr Zuständigkeiten in der Schulpolitik erhalten. 20/38',
    // 'Der Bund soll Projekte zur Bekämpfung des Antisemitismus stärker finanziell unterstützen. 21/38',
    // 'Chinesische Firmen sollen keine Aufträge für den Ausbau der Kommunikationsinfrastruktur in Deutschland erhalten dürfen. 22/38',
    // 'Der Staat soll weiterhin für Religionsgemeinschaften die Kirchensteuer einziehen. 23/38',
    // 'Der kontrollierte Verkauf von Cannabis soll generell erlaubt sein. 24/38',
    // 'Deutschland soll aus der Europäischen Union austreten. 25/38',
    // 'Die Landeslisten der Parteien für die Wahlen zum Deutschen Bundestag sollen abwechselnd mit Frauen und Männern besetzt werden müssen. 26/38',
    // 'Stationäre Behandlungen im Krankenhaus sollen weiterhin über eine Fallpauschale abgerechnet werden. 27/38',
    // 'Auf hohe Vermögen soll wieder eine Steuer erhoben werden. 28/38',
    // 'Bei der Videoüberwachung öffentlicher Plätze soll Gesichtserkennungssoftware eingesetzt werden dürfen. 29/38',
    // 'Auch Ehepaare ohne Kinder sollen weiterhin steuerlich begünstigt werden. 30/38',
    // 'Ökologische Landwirtschaft soll stärker gefördert werden als konventionelle Landwirtschaft. 31/38',
    // 'Islamische Verbände sollen als Religionsgemeinschaften staatlich anerkannt werden können. 32/38',
    // 'Der staatlich festgelegte Preis für den Ausstoß von CO2 beim Heizen und Autofahren soll stärker steigen als geplant. 33/38',
    // 'Die Schuldenbremse im Grundgesetz soll beibehalten werden. 34/38',
    // 'Asyl soll weiterhin nur politisch Verfolgten gewährt werden. 35/38',
    // 'Der gesetzliche Mindestlohn soll spätestens im Jahr 2022 auf mindestens 12 Euro erhöht werden. 36/38',
    // 'Der Flugverkehr soll höher besteuert werden. 37/38',
    'Unternehmen sollen selbst entscheiden, ob sie ihren Beschäftigten das Arbeiten im Homeoffice erlauben. 38/38',
];

const checkForFeedbackRequests = async () => {
    const now = DateTime.now();
    const oneWeekAgo = now.minus({ weeks: 1 });

    const users = await db.db('contrabot').collection("users").find({
        completionTime: { 
            $lt: oneWeekAgo.toISO()
        },
        feedbackRequestSent: { $ne: true } // This ensures that you don't ask for feedback multiple times
    }).toArray();

    for (const user of users) {
        const discordUser = await client.users.fetch(user.userId);
        if (discordUser) {
            discordUser.send(`Hallo, vor einer Woche hast du den Test ausgefültt. 
            Wir können Contraversum nur verbessern durch Feedback von unseren Nutzern. 
            Daher wäre es ein wichtiger Beitrag für das Projekt und damit auch für die depolarisierung 
            der Gesellschaft wenn du @LorenzoSalsaccia eine Nachricht schreiben könntest wie deine 
            Erfahrung war und was wir besser machen können. Vielen Dank, dein ContraBot <3`);

            // Mark that the feedback request has been sent to avoid asking multiple times.
            await db.db('contrabot').collection("users").updateOne(
                { userId: user.userId },
                {
                    $set: { 
                        feedbackRequestSent: true 
                    }
                }
            );
        }
    }
};


const job = new cron.CronJob('0 * * * *', checkForFeedbackRequests); // This runs every hour. Modify as needed.
job.start();


const sendQuestion = async (interaction: any) => {

    const userContext = await db.db('contrabot').collection("users").findOne({ userId: interaction.user.id });
    
    let currentQuestionIndex = userContext?.currentQuestionIndex || 0;
    let userResponses = userContext?.userVector || [];

    if (currentQuestionIndex === 0) {
        userResponses = [];
    }

    if (currentQuestionIndex < questions.length) {
        const embed = new EmbedBuilder()
            .setTitle("Frage:")
            .setDescription(questions[ currentQuestionIndex ])
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
            interaction.user.send(`Dein bester Gesprächspartner ist: **${bestMatch}**.`);
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
                    completionTime: DateTime.now().toISO(), // Set completion time
                }
            }
        );
    }
}

async function findMatchingUser(userId: string, userResponses: number[]): Promise<string | null> {
    const users = await db.db('contrabot').collection("users").find({}).toArray();

    let closestUser: { userId: string, username: string } | null = null;
    let closestValue = Infinity;

    for (const user of users) {
        if (user.userId === userId) continue;

        const dotProduct = userResponses.reduce((acc, value, index) => acc + value * user.userVector[index], 0);
        const distanceFromZero = Math.abs(dotProduct);

        if (distanceFromZero < closestValue) {
            closestValue = distanceFromZero;
            closestUser = { userId: user.userId, username: user.username };
        }
    }

    return closestUser?.username || null;
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
