# ContraBot

## What problem are we solving?
Politcal tensions are on the rise in a lot of countries. This is especially true in the Germany. The political climate is so polarized that people are having a hard time finding common ground. This is a problem because it is important to be able to have a civil discussion with people who have different opinions. This is the only way to make progress and find solutions to problems.
Nevertheless it is hard to find people with different opinions. This is why we created ContraBot. ContraBot is a Discord bot that matches people with different political opinions. This way people can have a civil discussion with people who have different opinions, find common ground and make progress. Find out more about us and our Mission on our website: https://contraversum.org/

## General overview 
The bot matches people based on their political opinions. When a user types '/test' in the Contraversum Discord Server, the bot is invoked and will send a direct message to the user.

It then starts by iterating over an array containing the questions. After a user responds to a question with 👍, 👎, or 😐, the next question will be sent to the user. However, before this, the user's reaction will be converted into scores of +1, -1, or 0. These scores are saved in an array designed to function as a vector representing the user's political opinion.

After the bot has iterated through all the questions, it sends a final message. It then compares the vector of the new user to the vectors of previous users using an algorithm that compares the vectors and returns a score of how similar the vectors are. The user with the lowest score is the best match. The bot then sends a message informing the new user of their closest match. Read more about the algorithm in the [Matching.md](https://github.com/Contraversum/ContraBot/blob/main/documentation/Matching.md) file.

At last the user will get the 'verified' role on the sever so that he can interact with other users.

## How to use the bot

Join the Contraversum Discord Server: https://discord.gg/u54FVU8rma and run /test in the chat. The bot will then guide you through the process.

## How can I contribute?
We are always looking for new contributors. If you want to contribute to the project, please read the [Quicksrart.md](https://github.com/Contraversum/ContraBot/blob/main/documentation/Quickstart.md) file. It will guide you through the process of setting up the project on your local machine. Also read the rest of our documentation to get a better understanding of the project. If you have any questions, feel free to contact us on Discord: https://discord.gg/u54FVU8rma