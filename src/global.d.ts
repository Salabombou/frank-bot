declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    BOT_TOKEN: string;
    APPROVAL_CHANNEL_ID: string;
    SINK_CHANNEL_ID: string;
    NSFW_CHANNEL_ID: string;
    SERIOUS_CHANNEL_ID: string;
    SUOMI_CHANNEL_ID: string;
  }
}
