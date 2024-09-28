import { Client, IntentsBitField, Partials } from 'discord.js';
import dotenv from 'dotenv';

import useSubmission from './events/submission.js';

import logger from './utils/logger.js';

dotenv.config();

const client: Client<true> = new Client({
  intents: [
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.DirectMessagePolls,
    IntentsBitField.Flags.DirectMessageReactions,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessagePolls,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

client.on('ready', async () => {
  await client.application.fetch();

  await useSubmission(client);

  logger.info(`Logged in as ${client.user!.tag}`);

  process.on('unhandledRejection', (error) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.error(error);
    }
  });
  process.on('uncaughtException', (error) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.error(error);
    }
  });
});

if (process.env.NODE_ENV !== 'production') {
  logger.warn('Running in development mode. Logging all errors.');
}

client.login(process.env.BOT_TOKEN);
