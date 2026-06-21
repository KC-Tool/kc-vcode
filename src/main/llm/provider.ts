export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatParams {
  messages: Message[]
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export interface CompleteParams {
  prompt: string
  language?: string
  filePath?: string
  maxTokens?: number
  temperature?: number
}

export interface ChatChunk {
  type: 'text' | 'done'
  content: string
}

export interface LLMProvider {
  chat(params: ChatParams): AsyncGenerator<ChatChunk>
  complete(params: CompleteParams): AsyncGenerator<string>
}

export type LLMProviderType = 'openai' | 'anthropic'

export interface LLMConfig {
  provider: LLMProviderType
  apiKey: string
  model: string
  baseUrl?: string
}