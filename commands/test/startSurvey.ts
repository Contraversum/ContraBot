const Feedbackquestions = [
    'Was hat dich dazu bewegt, unseren Discord Bot zu nutzen?',
    'Wie würdest du deine erste Interaktion mit dem Bot beschreiben? Gab es etwas, das dir sofort positiv oder negativ aufgefallen ist?',
    'Konntest du mit dem anderen User ein produktives Gespräch führen? Wenn ja, was hat dazu beigetragen? Wenn nein, was hat gefehlt?',
    'Würdest du den Bot ein weiteres Mal verwenden? Warum oder warum nicht?',
    'Welche drei Dinge würdest du an unserem Bot sofort ändern, wenn du könntest?',
    'Gibt es Funktionen, die du dir für unseren Bot wünschst, die es derzeit nicht gibt?',
    'Wie wahrscheinlich ist es, dass du unseren Bot weiterempfehlen würdest? (Skala von 1-10)',
    'Was würde dich daran hindern den Bot weiter zu empfehlen?',
    'Was sind deiner Meinung nach die größten Hindernisse für eine produktive politische Diskussion?',
    'Wie gehst du normalerweise mit Menschen um, die politisch stark von dir abweichen?',
    'Was erhoffst du dir von einem Gespräch mit jemandem, der politisch anders denkt als du?',
    'Wie Alt bist du',
    'Welches Geschlecht hast du?',
    'Was ist deine Tätigkeit (Beruf, Studienfach etc.)',
    'Gibt es sonst noch etwas, das du uns mitteilen möchtest?',
    'Was ist deine Mailadresse?'
];

async function sendSurveyQuestions(interaction: any) {
    console.log("Starting survey for user " + interaction.user.id);
    interaction.user.send(Feedbackquestions[0]);  // Send the first survey question
}


export { sendSurveyQuestions, Feedbackquestions }