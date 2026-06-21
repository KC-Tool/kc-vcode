import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import {
  LLMProvider,
  LLMConfig,
  ChatParams,
  CompleteParams,
  ChatChunk,
  Message
} from './provider'

export function createCloudProvider(config: LLMConfig): LLMProvider {
  if (config.provider === 'anthropic') {
    return new AnthropicAdapter(config)
  }
  return new OpenAIAdapter(config)
}

class OpenAIAdapter implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined
    })
    this.model = config.model
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt })
    }
    for (const m of params.messages) {
      messages.push({ role: m.role, content: m.content })
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: true
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield { type: 'text', content: delta }
      }
    }
    yield { type: 'done', content: '' }
  }

  async *complete(params: CompleteParams): AsyncGenerator<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
    if (params.language) {
      messages.push({
        role: 'system',
        content: `You are a code completion engine. Complete the code at the cursor position. Output ONLY the completion text, no explanations, no markdown, no code fences. Language: ${params.language}`
      })
    }
    messages.push({ role: 'user', content: params.prompt })

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 256,
      stream: true
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield delta
      }
    }
  }
}

class AnthropicAdapter implements LLMProvider {
  private client: Anthropic
  private model: string

  constructor(config: LLMConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined
    })
    this.model = config.model
  }

  async *chat(params: ChatParams): AsyncGenerator<ChatChunk> {
    let systemPrompt = params.systemPrompt || ''
    const messages: Anthropic.MessageParam[] = []

    for (const m of params.messages) {
      if (m.role === 'system') {
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${m.content}` : m.content
      } else {
        messages.push({ role: m.role as 'user' | 'assistant', content: m.content })
      }
    }

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', content: event.delta.text }
      }
    }
    yield { type: 'done', content: '' }
  }

  async *complete(params: CompleteParams): AsyncGenerator<string> {
    const system = `You are a code completion engine. Complete the code at the cursor position. Output ONLY the completion text, no explanations, no markdown, no code fences. Language: ${params.language || 'text'}`

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: params.maxTokens ?? 256,
      temperature: params.temperature ?? 0.3,
      system,
      messages: [{ role: 'user', content: params.prompt }]
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }
}