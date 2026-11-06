import 'dotenv/config';

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    // only throw for truly required ones when accessed; here we warn
  }
  return v ?? '';
}

export const env = {
  mongoUri: process.env.MONGODB_URI ?? '',
  dbName: process.env.MONGODB_DB ?? 'alex-ea',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-prod',
  firstHeadName: process.env.FIRST_HEAD_NAME ?? 'dr admin',
  firstHeadUsername: process.env.FIRST_HEAD_USERNAME ?? 'admin',
  firstHeadPassword: process.env.FIRST_HEAD_PASSWORD ?? 'admin',
  ocrSpaceKey: process.env.OCR_SPACE_KEY ?? '',
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? '',
  retentionDays: Number(process.env.RETENTION_DAYS ?? '30'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

export function requireEnv(name: keyof typeof env): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return String(v);
}
