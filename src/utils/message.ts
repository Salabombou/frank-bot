import crypto from 'crypto';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  type MessageCreateOptions
} from 'discord.js';

import { Button } from '../enums/button.js';

export function messageIsEmpty(message: Message) {
  if (message.content.trim() !== '') {
    return false;
  } else if (message.attachments.size > 0) {
    return false;
  } else if (message.poll) {
    return false;
  } else if (message.stickers.size > 0) {
    return false;
  } else {
    return true;
  }
}

export function parseSubmission(message: Message):
  | (MessageCreateOptions & {
      components: ActionRowBuilder<ButtonBuilder>[];
      files: (string | AttachmentBuilder)[];
    })
  | null {
  const submission: ReturnType<typeof parseSubmission> = {
    components: [],
    files: []
  };

  submission.files.push(...message.attachments.map((a) => a.url));
  submission.files.push(...message.stickers.map((s) => s.url));

  if (message.poll) {
    submission.poll = {
      question: message.poll.question,
      answers: message.poll.answers.map((a) => ({
        text: String(a.text)
      })),
      allowMultiselect: message.poll.allowMultiselect,
      duration: Math.ceil((message.poll.expiresTimestamp - message.createdTimestamp) / 3_600_000)
    };
  }

  submission.content = message.content.trim();

  const tripcode = submission.content.split(/\s+/).pop();
  if (tripcode && tripcode.match(/.+#.+/)) {
    const username = tripcode.split('#')[0]!.substring(0, 32);

    const hashedPassword = crypto.createHash('sha512').update(tripcode).digest('hex');

    submission.content = submission.content.slice(0, -tripcode.length).trim();
    submission.components.push(
      new ActionRowBuilder<ButtonBuilder>().setComponents(
        new ButtonBuilder()
          .setCustomId('tripcode')
          .setLabel(`Signed by ${username}#${hashedPassword.slice(0, 6)}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji('🔒')
          .setDisabled(true)
      )
    );
  }

  submission.content = submission.content.trim();
  if (submission.content === '' && submission.files.length === 0 && !submission.poll) {
    return null;
  }

  const timestamp = `\n<t:${Math.floor(message.createdTimestamp / 1000)}:F>`;
  const finalContent = submission.content + timestamp;

  if (finalContent.length > 2000) {
    submission.files.push(
      // prettier-ignore
      new AttachmentBuilder(Buffer.from(submission.content))
        .setName('content.txt')
    );
    submission.content = timestamp.trimStart();
  } else {
    submission.content = finalContent;
  }

  return submission;
}

export function submissionControls(undo = false) {
  const approveButton = new ButtonBuilder()
    .setCustomId(Button.ApproveSink)
    .setLabel('Approve')
    .setStyle(ButtonStyle.Success)
    .setDisabled(undo);

  const approveNsfwButton = new ButtonBuilder()
    .setCustomId(Button.ApproveNsfw)
    .setLabel('NSFW')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(undo);

  const approveSeriousButton = new ButtonBuilder()
    .setCustomId(Button.ApproveSerious)
    .setLabel('Serious')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(undo);

  const approveSuomiButton = new ButtonBuilder()
    .setCustomId(Button.ApproveSuomi)
    .setLabel('Suomi')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(undo);

  const denyButton = new ButtonBuilder()
    .setCustomId(Button.Deny)
    .setLabel('Deny')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(undo);

  const components = [
    new ActionRowBuilder<ButtonBuilder>().setComponents(
      approveButton,
      approveNsfwButton,
      approveSeriousButton,
      approveSuomiButton,
      denyButton
    )
  ];

  if (undo) {
    const undoButton = new ButtonBuilder()
      .setCustomId(Button.Undo)
      .setLabel('Undo')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(false);

    components.unshift(new ActionRowBuilder<ButtonBuilder>().setComponents(undoButton));
  }

  return components;
}

export function removeSelfReactions(message: Message) {
  const reactions = message.reactions.cache.filter((r) => r.me);
  return Promise.allSettled(reactions.map((r) => r.users.remove(r.client.user.id)));
}
