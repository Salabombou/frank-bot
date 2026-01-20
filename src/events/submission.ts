import { Mutex } from 'async-mutex';
import { type Client, Events, type Message } from 'discord.js';

import { Button } from '../enums/button.js';
import { messageIsEmpty, parseSubmission, removeSelfReactions, submissionControls } from '../utils/message.js';

export default async function useSubmission(client: Client<true>) {
  const approvalChannel = await client.channels.fetch(process.env.APPROVAL_CHANNEL_ID);
  const sinkChannel = await client.channels.fetch(process.env.SINK_CHANNEL_ID);
  let nsfwChannel = process.env.NSFW_CHANNEL_ID
    ? await client.channels.fetch(process.env.NSFW_CHANNEL_ID).catch(() => null)
    : null;
  let seriousChannel = process.env.SERIOUS_CHANNEL_ID
    ? await client.channels.fetch(process.env.SERIOUS_CHANNEL_ID).catch(() => null)
    : null;
  let suomiChannel = process.env.SUOMI_CHANNEL_ID
    ? await client.channels.fetch(process.env.SUOMI_CHANNEL_ID).catch(() => null)
    : null;

  if (!approvalChannel || !sinkChannel) {
    throw new Error('Approval or Sink channel IDs are invalid.');
  }

  if (
    !(approvalChannel.isTextBased() && approvalChannel.isSendable() && !approvalChannel.isDMBased()) ||
    !(sinkChannel.isTextBased() && sinkChannel.isSendable() && !sinkChannel.isDMBased())
  ) {
    throw new Error('Approval or Sink channel IDs do not belong to a valid guild text channel.');
  }

  if (nsfwChannel && !(nsfwChannel.isTextBased() && nsfwChannel.isSendable() && !nsfwChannel.isDMBased())) {
    console.warn('NSFW channel ID is invalid or not a text channel. Disabling NSFW feature.');
    nsfwChannel = null;
  }

  if (
    seriousChannel &&
    !(seriousChannel.isTextBased() && seriousChannel.isSendable() && !seriousChannel.isDMBased())
  ) {
    console.warn('Serious channel ID is invalid or not a text channel. Disabling Serious feature.');
    seriousChannel = null;
  }

  if (suomiChannel && !(suomiChannel.isTextBased() && suomiChannel.isSendable() && !suomiChannel.isDMBased())) {
    console.warn('Suomi channel ID is invalid or not a text channel. Disabling Suomi feature.');
    suomiChannel = null;
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
        content: 'Submission failed to parse (Mayhaps you forgot to add other content than the tripcode?)'
      });
      return;
    }

    const pendingMessage = await approvalChannel
      .send({
        ...submission,
        components: [
          ...submission.components,
          ...submissionControls(false, {
            showNsfw: !!nsfwChannel,
            showSerious: !!seriousChannel,
            showSuomi: !!suomiChannel
          })
        ]
      })
      .catch((e) => {
        message.reply({
          content: 'Submission failed to send. Try again later (Mayhaps your attachment(s) are too large?)'
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
      return mutex.runExclusive(async () => {
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

          let submissionChannel: typeof sinkChannel;
          switch (interaction.customId) {
            case Button.ApproveSink:
              submissionChannel = sinkChannel;
              reactionEmote = '✅';
              break;
            case Button.ApproveNsfw:
              if (!nsfwChannel) return;
              submissionChannel = nsfwChannel as typeof sinkChannel;
              reactionEmote = '🔞';
              break;
            case Button.ApproveSerious:
              if (!seriousChannel) return;
              submissionChannel = seriousChannel as typeof sinkChannel;
              reactionEmote = '✔️';
              break;
            case Button.ApproveSuomi:
              if (!suomiChannel) return;
              submissionChannel = suomiChannel as typeof sinkChannel;
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
          components: [
            ...submission.components,
            ...submissionControls(undo, {
              showNsfw: !!nsfwChannel,
              showSerious: !!seriousChannel,
              showSuomi: !!suomiChannel
            })
          ]
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
