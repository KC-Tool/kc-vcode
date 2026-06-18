export interface Snippet {
  label: string
  insert: string
  detail: string
}

export type SnippetMap = Record<string, Snippet[]>