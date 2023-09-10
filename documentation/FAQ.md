# FAQ #

## What is ContraBot? ##
ContraBot is a unique Discord bot for the Contraversum server that assesses users' political opinions based on their responses to 38 political questions. It then matches them with a user whose views most contrast with theirs, promoting productive dialogue and understanding. Find out more about the project on contraversum.org

## How does ContraBot determine my political opinion? ##
The bot presents you with 38 questions spanning various political subjects. You can respond to them with 👍, translating to a score of +1, 👎, translating to a score of -1, or 😐, translating to a score of 0. Each answer is stored in a vector, representing your political stance. To understand this in detail, please refer to the rest of the documentation.

## Why only 38 questions? How can they capture the complexity of my political beliefs? ##
While political beliefs are indeed complex, the 38 questions have been meticulously chosen to encompass a wide range of topics and ideologies. They offer a general snapshot of your political standing, without professing to capture every intricate detail.

## How is my match determined? ##
Your match is determined by comparing your vector to those of other users. The algorithm compares the vectors and returns a score of how similar the vectors are. The user with the lowest score is the best match. Read more about the algorithm in the [Matching.md](https://github.com/Contraversum/ContraBot/blob/main/documentation/Matching.md) file.

## What's the purpose of matching me with someone with contrasting views? ##
The main objective is to nurture understanding and initiate dialogue. Interacting with those holding differing viewpoints can help shatter echo chambers and expand one's perspectives, especially crucial in an era marked by pronounced political divides.

## Is my data kept private? ##
Absolutely. We are in the nascent stages and are striving to maximize privacy. Currently, we store your Discord userID in conjunction with your anonymized vector. This ensures that your political beliefs aren't directly linked to your account.

## Can I retake the questionnaire? ##
Yes, you can retake it as often as you'd like.

## What should I do if I have concerns about the person I'm matched with? ##
If you encounter any issues with your match, please report this to @lorenzosalsiccia, and appropriate action will be taken.

## Are there any guidelines for engaging with my opposite match? ##
Certainly. We champion respectful and constructive dialogue. Always remember, the aim is mutual understanding, not debate triumph. Personal attacks, hate speech, or any form of harassment are strictly prohibited.

## Can I opt-out of being matched? ##
Currently, opting out is not an option, but we're diligently working to incorporate this feature. If you can't wait, please contact @lorenzosalsiccia, and we'll remove your data from our database.
