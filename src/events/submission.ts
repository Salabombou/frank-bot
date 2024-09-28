import { Mutex } from 'async-mutex';
import { type Client, Events, type Message, TextChannel } from 'discord.js';

import { Button } from '../enums/button.js';
import {
  messageIsEmpty,
  parseSubmission,
  removeSelfReactions,
  submissionControls
} from '../utils/message.js';

export default async function useSubmission(client: Client<true>) {
  const approvalChannel = await client.channels.fetch(process.env.APPROVAL_CHANNEL_ID);
  const sinkChannel = await client.channels.fetch(process.env.SINK_CHANNEL_ID);
  const nsfwChannel = await client.channels.fetch(process.env.NSFW_CHANNEL_ID);
  const seriousChannel = await client.channels.fetch(process.env.SERIOUS_CHANNEL_ID);
  const suomiChannel = await client.channels.fetch(process.env.SUOMI_CHANNEL_ID);

  if (!approvalChannel || !sinkChannel || !nsfwChannel || !seriousChannel || !suomiChannel) {
    throw new Error('One or more channel IDs are invalid.');
  } else if (
    !(approvalChannel instanceof TextChannel) ||
    !(sinkChannel instanceof TextChannel) ||
    !(nsfwChannel instanceof TextChannel) ||
    !(seriousChannel instanceof TextChannel) ||
    !(suomiChannel instanceof TextChannel)
  ) {
    throw new Error('One or more channel IDs do not belong to a guild text channel.');
  }

  client.on(Events.MessageCreate, async (message) => {
    if (!message.channel.isDMBased()) return;
    if (message.author.bot) return;

    if (messageIsEmpty(message)) {
      message.reply({
        content: 'Submission failed to parse (Mayhaps you forgot to add content?)'
      });
      return;
    }

    const submission = parseSubmission(message);
    if (!submission) {
      message.reply({
        content:
          'Submission failed to parse (Mayhaps you forgot to add other content than the tripcode?)'
      });
      return;
    }

    const pendingMessage = await approvalChannel
      .send({
        ...submission,
        components: [...submission.components, ...submissionControls()]
      })
      .catch((e) => {
        message.reply({
          content:
            'Submission failed to send. Try again later (Mayhaps your attachment(s) are too large?)'
        });
        throw e;
      });

    const collector = pendingMessage.createMessageComponentCollector({
      time: 24 * 60 * 60 * 1000
    });

    let submittedMessage: Message | null = null;
    let reactionEmote: string;
    let undo: boolean;

    const mutex = new Mutex();

    collector.on('collect', (interaction) => {
      mutex.runExclusive(async () => {
        collector.resetTimer({
          time: 24 * 60 * 60 * 1000,
          idle: 10 * 60 * 1000
        });

        await interaction.deferUpdate();

        if (interaction.customId === Button.Undo) {
          undo = false;
          reactionEmote = '↩️';
          if (submittedMessage) {
            await submittedMessage.delete().finally(() => {
              submittedMessage = null;
            });
          }
        } else if (interaction.customId === Button.Deny) {
          undo = true;
          reactionEmote = '⛔';
        } else if (!submittedMessage) {
          undo = true;

          let submissionChannel: TextChannel;
          switch (interaction.customId) {
            case Button.ApproveSink:
              submissionChannel = sinkChannel;
              reactionEmote = '✅';
              break;
            case Button.ApproveNsfw:
              submissionChannel = nsfwChannel;
              reactionEmote = '🔞';
              break;
            case Button.ApproveSerious:
              submissionChannel = seriousChannel;
              reactionEmote = '✔️';
              break;
            case Button.ApproveSuomi:
              submissionChannel = suomiChannel;
              reactionEmote = '🇫🇮';
              break;
            default:
              return;
          }

          await submissionChannel.send(submission).then((msg) => {
            submittedMessage = msg;
          });
        } else {
          return;
        }

        removeSelfReactions(message).finally(() => {
          message.react(interaction.customId === Button.Undo ? '☑️' : reactionEmote);
        });

        removeSelfReactions(pendingMessage).finally(() => {
          pendingMessage.react(reactionEmote);
        });

        pendingMessage.edit({
          components: [...submission.components, ...submissionControls(undo)]
        });
      });
    });

    collector.on('end', () => {
      pendingMessage.edit({
        components: submission.components
      });
      if (reactionEmote === '☑️' || reactionEmote === '↩️') {
        removeSelfReactions(message).finally(() => {
          message.react('💤');
        });
        removeSelfReactions(pendingMessage).finally(() => {
          pendingMessage.react('💤');
        });
      }
    });

    message.react('☑️');
  });
}
