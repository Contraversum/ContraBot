# Contrabot Development Quickstart Guide

This repository houses the "contrabot", a Discord bot for Contraversum, developed using Node.js, TypeScript, and discord.js.

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/en/download/)
- [MongoDB](https://www.mongodb.com/try/download/community) (especially if you're using the `mac-start` script)
- [TypeScript](https://www.typescriptlang.org/download) - You can also install this using npm: `npm install -g typescript`

## Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Contraversum/ContraBot/issues
   cd contrabot
   ```

2. **Install Dependencies**

   After navigating into the repository directory, install the necessary packages:

   ```bash
   npm install
   ```

3. **Managing the Discord Bot Token**

For the bot to interact with Discord, it requires a secret bot token provided by the Discord developer portal. This token acts as a unique identifier and a password for your bot, granting it various permissions, so it should be kept confidential.

Getting the Token: If you're setting up the bot for the first time or wish to run a local instance, you'll need to obtain a bot token:

Visit the Discord Developer Portal.
Navigate to the "Bot" tab .
Under the "TOKEN" section, click "Copy" to get your bot token.
Setting Up the Token Locally:

Create a '.env' file in the root directory of the project.
Inside the config file, set your token like this: token:"XXX".
If you suspect your bot token has been compromised, go back to the Discord Developer Portal and regenerate the token immediately. Along with the Token you will need to set up the other secrets that can be found in the moderator channel of the Contraversum Discord server.

## Setting up for production

You will need to join the ContraversumTest Discord Server. Here you will find the production bot. You can access the production bot by creating a branch from the 'pre-production' branch and altering the .env file. With the secrets that can be found in the moderator channel of the Contraversum Discord server.

### Setting up the MongoDB database

The production bot uses a MongoDB database. You can set up a MongoDB database using the following steps:

1. Install MongoDB https://www.mongodb.com/docs/manual/administration/install-community/
2. Create a database called 'contrabot'
3. Create a collection called 'users'

### Acessing the live database

You can access the live database using the following steps:


## Running the Bot

1. **Start the Bot**

   To run the bot in a standard environment:

   ```bash
   npm run start
   ```

   If you are on macOS and want to start MongoDB along with the bot:

   ```bash
   npm run mac-start
   ```

   Note: The `mac-start` script assumes you have MongoDB installed via Homebrew and the respective service named `mongodb-community@7.0`.

   If you are on GNU/Linuxand want to start MongoDB along with the bot you can use one of the follownig commands:

   ```bash
   npm run systemd-start
   ```

   or (depending if your OS uses systemd or System V Init)
   
   ```bash
   npm run systemv-start
   ```

   Note: The `systemd-start` and `systemv-start` script assumes you have MongoDB installed using the package manager.


## Development

1. **TypeScript Compilation**

   This project uses `ts-node` to directly run TypeScript, so you don't need to compile it separately. However, if you want to generate JavaScript files, you can set up a `tsc` script or run `tsc` directly.

## Conclusion

With these steps, you should be set up to develop and test the Contrabot. Always ensure to follow best practices and update dependencies as necessary to keep the bot secure and efficient.