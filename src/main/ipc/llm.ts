import { ipcMain } from 'electron'
import { loadSettings, saveSettings } from '../settingsStore'

export interface LlmConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model: string
  baseUrl?: string
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmChatRequest {
  messages: LlmMessage[]
  temperature?: number
  maxTokens?: number
}

function readConfig(): LlmConfig | null {
  const settings = loadSettings()
  return (settings?.llm as LlmConfig) || null
}

function ensureConfig(cfg: LlmConfig | null): asserts cfg is LlmConfig {
  if (!cfg || !cfg.apiKey || !cfg.model) {
    throw new Error('LLM not configured. Set provider / apiKey / model in Settings.')
  }
}

async function callOpenAI(cfg: LlmConfig, req: LlmChatRequest): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl || undefined
  })
  const res = await client.chat.completions.create({
    model: cfg.model,
    messages: req.messages,
    temperature: req.temperature,
    max_tokens: req.maxTokens
  })
  return res.choices[0]?.message?.content ?? ''
}

async function callAnthropic(cfg: LlmConfig, req: LlmChatRequest): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl || undefined })
  const system = req.messages.find(m => m.role === 'system')?.content
  const rest = req.messages.filter(m => m.role !== 'system') as Array<{ role: 'user' | 'assistant'; content: string }>
  const res = await client.messages.create({
    model: cfg.model,
    max_tokens: req.maxTokens ?? 1024,
    system,
    messages: rest,
    temperature: req.temperature
  })
  const block = res.content[0]
  return block && 'text' in block ? block.text : ''
}

export function registerLlmIpc(): void {
  ipcMain.handle('llm:getConfig', () => readConfig())

  ipcMain.handle('llm:configure', (_, config: Partial<LlmConfig>) => {
    const settings = loadSettings() || {}
    const current = (settings.llm as LlmConfig) || {} as LlmConfig
    // 合并而非覆盖，避免空字段把存储冲掉
    settings.llm = {
      provider: config.provider ?? current.provider ?? 'openai',
      apiKey: config.apiKey ?? current.apiKey ?? '',
      model: config.model ?? current.model ?? 'gpt-4o',
      baseUrl: config.baseUrl ?? current.baseUrl
    } as LlmConfig
    return saveSettings(settings)
  })

  ipcMain.handle('llm:chat', async (_, req: LlmChatRequest) => {
    const cfg = readConfig()
    ensureConfig(cfg)
    if (cfg.provider === 'anthropic') return callAnthropic(cfg, req)
    return callOpenAI(cfg, req)
  })
}