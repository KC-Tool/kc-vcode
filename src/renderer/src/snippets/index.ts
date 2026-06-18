import type { Snippet, SnippetMap } from './types'
import { jsSnippets } from './js'
import { tsSnippets } from './ts'
import { pySnippets } from './py'

export const allSnippets: SnippetMap = {
  javascript: jsSnippets,
  typescript: tsSnippets,
  python: pySnippets,
}

export type { Snippet, SnippetMap }