import { Collection, type Message } from 'discord.js';

import { messageIsEmpty, parseSubmission, removeSelfReactions, submissionControls } from './message.js';

describe('messageIsEmpty', () => {
  it('should return false if message has content', () => {
    const message = {
      content: 'Hello',
      attachments: new Collection(),
      poll: null,
      stickers: new Collection()
    } as unknown as Message;
    expect(messageIsEmpty(message)).toBe(false);
  });

  it('should return false if message has attachments', () => {
    const message = {
      content: '',
      attachments: new Map([['1', {}]]),
      poll: null,
      stickers: new Collection()
    } as unknown as Message;
    expect(messageIsEmpty(message)).toBe(false);
  });

  it('should return false if message has a poll', () => {
    const message = {
      content: '',
      attachments: new Collection(),
      poll: { question: 'Q', answers: [], allowMultiselect: false, expiresTimestamp: 0 },
      stickers: new Collection()
    } as unknown as Message;
    expect(messageIsEmpty(message)).toBe(false);
  });

  it('should return false if message has stickers', () => {
    const message = {
      content: '',
      attachments: new Collection(),
      poll: null,
      stickers: new Map([['1', {}]])
    } as unknown as Message;
    expect(messageIsEmpty(message)).toBe(false);
  });

  it('should return true if message is empty', () => {
    const message = {
      content: '',
      attachments: new Collection(),
      poll: null,
      stickers: new Collection()
    } as unknown as Message;
    expect(messageIsEmpty(message)).toBe(true);
  });
});

describe('parseSubmission', () => {
  it('should parse message with content', () => {
    const message = {
      content: 'Hello',
      attachments: new Collection(),
      stickers: new Collection(),
      createdTimestamp: 1234 * 1000
    } as unknown as Message;
    const result = parseSubmission(message);
    expect(result).toBeTruthy();
    expect(result!.content).toEqual(`Hello\n<t:1234:F>`);
  });

  it('should parse message with attachments', () => {
    const message = {
      content: '',
      attachments: new Collection([['1', { url: 'http://example.com' }]]),
      stickers: new Collection(),
      createdTimestamp: Date.now()
    } as unknown as Message;
    const result = parseSubmission(message);
    expect(result).toBeTruthy();
    expect(result!.files).toContain('http://example.com');
  });

  it('should parse message with stickers', () => {
    const message = {
      content: '',
      attachments: new Collection(),
      stickers: new Collection([['1', { url: 'http://example.com' }]]),
      createdTimestamp: Date.now()
    } as unknown as Message;
    const result = parseSubmission(message);
    expect(result).toBeTruthy();
    expect(result!.files).toContain('http://example.com');
  });

  it('should parse message with poll', () => {
    const message = {
      content: '',
      attachments: new Collection(),
      stickers: new Collection(),
      poll: {
        question: 'Q',
        answers: [{ text: 'A' }],
        allowMultiselect: false,
        expiresTimestamp: Date.now() + 3600000
      },
      createdTimestamp: Date.now()
    } as unknown as Message;
    const result = parseSubmission(message);
    expect(result).toBeTruthy();
    expect(result!.poll).toBeTruthy();
    expect(result!.poll!.question).toBe('Q');
    expect(result!.poll!.answers).toContainEqual({ text: 'A' });
    expect(result!.poll!.allowMultiselect).toBe(false);
    expect(result!.poll!.duration).toBe(1);
  });

  it('should parse message with tripcode', () => {
    const message = {
      content: 'Hello! User#tripcode',
      attachments: new Collection(),
      stickers: new Collection(),
      createdTimestamp: 1234 * 1000
    } as unknown as Message;
    const result = parseSubmission(message);
    expect(result).toBeTruthy();
    expect(result!.content).toEqual(`Hello!\n<t:1234:F>`);
    expect(result!.components.length).toBeGreaterThan(0);
  });

  it('should return null for message with no other content than the tripcode', () => {
    const message = {
      content: 'User#tripcode',
      attachments: new Collection(),
      stickers: new Collection(),
      createdTimestamp: Date.now()
    } as unknown as Message;
    const result = parseSubmission(message);
    expect(result).toBe(null);
  });

  it('should return null for empty message', () => {
    const message = {
      content: '',
      attachments: new Collection(),
      stickers: new Collection(),
      createdTimestamp: Date.now()
    } as unknown as Message;
    const result = parseSubmission(message);
    expect(result).toBe(null);
  });
});

describe('submissionControls', () => {
  it('should return controls without undo button when undo is false', () => {
    const controls = submissionControls(false);
    expect(controls.length).toBe(1);
    expect(controls[0]!.components.length).toBe(5);
  });

  it('should return controls with undo button when undo is true', () => {
    const controls = submissionControls(true);
    expect(controls.length).toBe(2);
    expect(controls[0]!.components.length).toBe(1);
    expect(controls[1]!.components.length).toBe(5);
  });
});

describe('removeSelfReactions', () => {
  it('should remove self reactions', async () => {
    const reaction = {
      me: true,
      users: { remove: jest.fn().mockResolvedValue(true) },
      client: { user: { id: '123' } }
    };
    const message = {
      reactions: { cache: new Collection([['1', reaction]]) }
    } as unknown as Message;
    await removeSelfReactions(message);
    expect(reaction.users.remove).toHaveBeenCalledWith('123');
  });

  it('should handle no self reactions', async () => {
    const message = { reactions: { cache: new Collection() } } as unknown as Message;
    const result = await removeSelfReactions(message);
    expect(result).toEqual([]);
  });
});
