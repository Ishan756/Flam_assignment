import 'dotenv/config';

const config = {
  baseURL: process.env.AI_BASE_URL?.trim() || '',
  apiKey: process.env.AI_API_KEY?.trim() || '',
  model: process.env.AI_MODEL?.trim() || '',
};

export function isConfigured() {
  return Boolean(config.baseURL && config.model);
}

export function getConfig() {
  return config;
}
