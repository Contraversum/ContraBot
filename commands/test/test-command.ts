import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Guild, Role, User, TextChannel } from 'discord.js';
import { client, db } from '../../common';
import cron from 'cron';
import 'dotenv/config'

const questions = [
    { question: 'Auf allen Autobahnen soll ein generelles Tempolimit gelten.', tag: ['Verkehrssicherheit', ' Klimawandel'] },
    { question: 'Deutschland soll seine Verteidigungsausgaben erhöhen.', tag: 'Verteidigungspolitik' },
    { question: 'Bei Bundestagswahlen sollen auch Jugendliche ab 16 Jahren wählen dürfen.', tag: ['Wahlalter', 'Demokratie'] },
    { question: 'Die Förderung von Windenenergie soll beendet werden?', tag: ['Energiepolitik', 'Klimawandel'] },
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
    { question: 'Unternehmen sollen selbst entscheiden, ob sie ihren Beschäftigten das Arbeiten im Homeoffice erlauben.', tag: ['Arbeitsrecht', 'Digitalisierung'] },
];

const checkForFeedbackRequests = async () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const users = await db.db('contrabot').collection("users").find({
        completionTime: {
            $lt: oneWeekAgo.toISOString()
        },
        feedbackRequestSent: { $ne: true } // This ensures that you don't ask for feedback multiple times
    }).toArray();

    // Create a button to start the survey
    const startSurveyButton = new ButtonBuilder()
        .setCustomId('start_survey')
        .setLabel('Jetzt Feedback geben')
        .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(startSurveyButton);

    for (const user of users) {
        const discordUser = await client.users.fetch(user.userId);
        if (discordUser) {
            await discordUser.send({
                content: `
                Hallo 👋, vor einer Woche hast du den Test ausgefüllt. 
                Wir können Contraversum nur durch Feedback unserer Nutzerinnen und Nutzer verbessern. 
                Daher wäre es ein wichtiger Beitrag für das Projekt und damit auch für die Depolarisierung
                der Gesellschaft, wenn du uns Feedback geben könntest. Es dauert weniger als 3 Minuten. Vielen Dank, dein ContraBot ❤️`,
                components: [actionRow]
            });

            // Update context for this user in the database
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

const job = new cron.CronJob('0 0 * * * *', checkForFeedbackRequests); // checks for Feedback every hour
job.start();


export const sendTestButton = async () => {
    const button = new ButtonBuilder()
        .setCustomId('start_test')
        .setLabel('Start Test')
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

    const guildId = process.env.GUILD_ID;
    if (!guildId) throw new Error('GUILD_ID is not defined in .env');

    const guild: Guild | undefined = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    (guild.channels.cache.get("1135557183845711983") as TextChannel).send({ components: [actionRow] });
};


const sendTestReminder = async () => {
    try {
        const guildId = process.env.GUILD_ID;
        if (!guildId) throw new Error('GUILD_ID is not defined in .env');

        const guild: Guild | undefined = client.guilds.cache.get(guildId);
        if (!guild) throw new Error('Guild not found');

        const verifiedRole: Role | undefined = guild.roles.cache.get('1143590879274213486');
        if (!verifiedRole) throw new Error('Verified role not found');

        const members = await guild.members.fetch().catch(console.error);
        if (!members) throw new Error('Verified role not found');

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        for (const [userID, member] of members) {
            const joinDate = member.joinedAt;
            if (!joinDate) continue;

            const user = await db.db('contrabot').collection('users').findOne({ userId: userID });

            if (
                !member.roles.cache.has(verifiedRole.id) &&
                joinDate <= oneWeekAgo &&
                !user?.reminderSent
            ) {
                // Send the test reminder to the member
                await member.send("Hey 👋, du hast den Test noch nicht ausgefüllt. Wir würden uns freuen, wenn du den Test noch ausfüllst, damit du mit anderen Usern gematcht werden kannst.");
                await member.send("Um einen Test zu starten, tippe /test in den Server ein oder klicke auf die rote Taste 'Test starten' im Channel #how to basics.");

                // Update user reminderSent status in  database 
                await db.db('contrabot').collection('users').updateOne(
                    { userId: userID },
                    {
                        $set:
                            { reminderSent: true }
                    },
                    { upsert: true }
                );
            }
        }
    } catch (error) {
        console.error('Error sending test reminders:', error);
    }
};

// Schedule the function to run every day
const dailyJob = new cron.CronJob('0 0 0 * * *', sendTestReminder);
dailyJob.start();

export const sendQuestion = async (interaction: any) => {

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
                    userVector: userResponses,
                    feedbackRequestSent: false,
                    currentFeedbackQuestionIndex: 0,
                    invited: interaction.user.invited,
                    joined: interaction.user.joinedTimestamp

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

            // Send the best match that they have been matched with the user
            const bestMatchUser = await client.users.fetch(bestMatch.userId);
            if (bestMatchUser) {
                bestMatchUser.send(`Hey 👋, du wurdest mit: **@${interaction.user.username}** gematched.`);
                bestMatchUser.send("Ihr habt euch bei diesen drei Fragen beispielsweise unterschieden:");
            }
            conversationStarter(interaction, bestMatch.userVector, userResponses, bestMatchUser)
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
                    completionTime: new Date().toISOString(), // Set completion time
                }
            }
        );
    }
}




async function conversationStarter(interaction: any, bestMatch: number[], user: number[], bestMatchUser: User) {

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
    if (!addedToDisagree || disagree.length < 6) {
        user.forEach((value, i) => {
            const total = value + bestMatch[i];
            if (Math.abs(total) === 1) {
                disagree.push(i);
            }
        });
    }

    const selectedIndexes = getRandomDisagreement(disagree, 6);
    sendDisagreedQuestions(interaction.user, selectedIndexes.slice(0, 3));
    if (bestMatchUser) {
        sendDisagreedQuestions(bestMatchUser, selectedIndexes.slice(-3))
    }
}

function getRandomDisagreement(arr: number[], num: number) {
    return Array.from({ length: Math.min(num, arr.length) }, () => arr.splice(Math.floor(Math.random() * arr.length), 1)[0]);
}

function sendDisagreedQuestions(user: User, disagree: number[]) {
    disagree.forEach((value) => {
        user.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`Frage: ${value + 1}/38`)
                    .setDescription(questions[value].question)
                    .setColor('#fb2364')
            ]
        });
    });

    // Make it so that the tags of the questions are printed properly
    const selectedTags = disagree
        .map(index => questions[index].tag)
        .filter(tag => tag)
        .slice(0, 3);

    const topicsMessage = `Als Gesprächsthemen können z.B. ${selectedTags.map(tag => `**${tag}**`).join(", ")} besprochen werden.`;
    user.send(topicsMessage);
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
    const guildId = process.env.GUILD_ID;
    if (!guildId) throw new Error('GuildId not found');

    const guild: Guild | undefined = client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const role: Role | undefined = guild.roles.cache.get('1153647196449820755');
    if (!role) throw new Error('Role not found');

    const member = guild.members.cache.get(interaction.user.id);
    if (!member) throw new Error('Member not found');

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

