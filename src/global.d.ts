declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly BOT_TOKEN: string;
    readonly APPROVAL_CHANNEL_ID: string;
    readonly SINK_CHANNEL_ID: string;
    readonly NSFW_CHANNEL_ID: string;
    readonly SERIOUS_CHANNEL_ID: string;
    readonly SUOMI_CHANNEL_ID: string;
  }
}
