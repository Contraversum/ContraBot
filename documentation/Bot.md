# How the Bot works 

## General overview 
The bot matches people based on their political opinions. When a user types '/test' in the Contraversum Discord Server, the bot is invoked and will send a direct message to the user.

It then starts by iterating over an array containing the questions. After a user responds to a question with 👍, 👎, or 😐, the next question will be sent to the user. However, before this, the user's reaction will be converted into scores of +1, -1, or 0. These scores are saved in an array designed to function as a vector representing the user's political opinion.

After the bot has iterated through all the questions, it sends a final message. It then compares the vector of the new user to the vectors of previous users using the dot product. The algorithm identifies a user whose dot product result is closest to 0.

The bot then sends a message informing the new user of their closest match.