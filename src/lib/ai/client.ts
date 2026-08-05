import ZAI from "z-ai-web-dev-sdk";

let _client: ZAI | null = null;

export async function getAI(): Promise<ZAI> {
  if (_client) return _client;
  _client = await ZAI.create();
  return _client;
}
