import React from 'react'

const s = { width: '1em', height: '1em', viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' }

const TsIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#3178c6" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="sans-serif">TS</text></svg>
)

const JsIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e" />
  <text x="8" y="11.5" textAnchor="middle" fill="#000" fontSize="7" fontWeight="700" fontFamily="sans-serif">JS</text></svg>
)

const JsonIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#5b5b5b" />
  <text x="8" y="11" textAnchor="middle" fill="#fbc02d" fontSize="6" fontWeight="700" fontFamily="monospace">{'{}'}</text></svg>
)

const MdIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#42a5f5" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="sans-serif">M↓</text></svg>
)

const CssIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#264de4" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">CSS</text></svg>
)

const HtmlIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#e44d26" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="sans-serif">{'< >'}</text></svg>
)

const PyIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#3776ab" />
  <text x="8" y="11.5" textAnchor="middle" fill="#ffd43b" fontSize="7" fontWeight="700" fontFamily="sans-serif">Py</text></svg>
)

const GoIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#00add8" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="sans-serif">Go</text></svg>
)

const RustIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#dea584" />
  <text x="8" y="11.5" textAnchor="middle" fill="#000" fontSize="6.5" fontWeight="700" fontFamily="sans-serif">Rs</text></svg>
)

const JavaIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#f89820" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="sans-serif">Jv</text></svg>
)

const CIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#555" />
  <text x="8" y="11.5" textAnchor="middle" fill="#03599c" fontSize="7" fontWeight="700" fontFamily="sans-serif">C</text></svg>
)

const ShellIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#4eaa25" />
  <text x="8" y="11" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="monospace">$_</text></svg>
)

const YamlIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="5.5" fontWeight="700" fontFamily="sans-serif">YML</text></svg>
)

const SqlIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#336791" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="700" fontFamily="sans-serif">SQL</text></svg>
)

const GitIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#f05032" />
  <text x="8" y="11.5" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700" fontFamily="sans-serif">Git</text></svg>
)

const LockIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#666" />
  <text x="8" y="11.5" textAnchor="middle" fill="#aaa" fontSize="6" fontWeight="700" fontFamily="sans-serif">LCK</text></svg>
)

const ConfigIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#607d8b" />
  <text x="8" y="11.5" textAnchor="middle" fill="#cfd8dc" fontSize="6" fontWeight="700" fontFamily="sans-serif">CFG</text></svg>
)

const TextIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#555" />
  <text x="8" y="11.5" textAnchor="middle" fill="#bbb" fontSize="6" fontWeight="700" fontFamily="sans-serif">TXT</text></svg>
)

const ImgIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#7b1fa2" />
  <text x="8" y="11" textAnchor="middle" fill="#e1bee7" fontSize="5.5" fontWeight="700" fontFamily="sans-serif">IMG</text></svg>
)

const ArchiveIcon = () => (
  <svg {...s}><rect x="1" y="1" width="14" height="14" rx="2" fill="#795548" />
  <text x="8" y="11" textAnchor="middle" fill="#d7ccc8" fontSize="5" fontWeight="700" fontFamily="sans-serif">ZIP</text></svg>
)

const FolderIcon = () => (
  <svg {...s}><path d="M2 3h5l1 1.5H14a1 1 0 011 1V12a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z"
    fill="#e8a838" /></svg>
)

const FolderOpenIcon = () => (
  <svg {...s}><path d="M2 3h5l1 1.5H14a1 1 0 011 1V6H3.5L2 12V3z"
    fill="#e8a838" /><path d="M1 7h14l-1.5 5.5a1 1 0 01-1 .5H2.5a1 1 0 01-1-.5L1 7z"
    fill="#f0b848" /></svg>
)

const FileIcon = () => (
  <svg {...s}><path d="M3 1.5h6.5L13 5v9.5a1 1 0 01-1 1H3a1 1 0 01-1-1v-12a1 1 0 011-1z"
    fill="#424242" /><path d="M9.5 1.5V5h3.5" fill="#616161" /></svg>
)

const fileMap: Record<string, React.FC> = {
  'package.json': JsonIcon,
  'tsconfig.json': ConfigIcon,
  '.gitignore': GitIcon,
  'dockerfile': ConfigIcon,
  'makefile': ConfigIcon,
  'readme.md': MdIcon,
}

const extMap: Record<string, React.FC> = {
  ts: TsIcon, tsx: TsIcon,
  js: JsIcon, jsx: JsIcon, mjs: JsIcon, cjs: JsIcon,
  json: JsonIcon, md: MdIcon,
  css: CssIcon, scss: CssIcon, less: CssIcon,
  html: HtmlIcon, htm: HtmlIcon,
  py: PyIcon, rs: RustIcon, go: GoIcon,
  yaml: YamlIcon, yml: YamlIcon,
  xml: HtmlIcon, sh: ShellIcon, bash: ShellIcon,
  sql: SqlIcon, graphql: SqlIcon, gql: SqlIcon,
  c: CIcon, cpp: CIcon, h: CIcon, hpp: CIcon,
  java: JavaIcon, swift: JavaIcon, kt: JavaIcon,
  dart: PyIcon, vue: HtmlIcon, svelte: HtmlIcon,
  toml: ConfigIcon, ini: ConfigIcon, cfg: ConfigIcon, env: ConfigIcon,
  lock: LockIcon,
  png: ImgIcon, jpg: ImgIcon, jpeg: ImgIcon, gif: ImgIcon, svg: ImgIcon, webp: ImgIcon, ico: ImgIcon,
  zip: ArchiveIcon, tar: ArchiveIcon, gz: ArchiveIcon, rar: ArchiveIcon, '7z': ArchiveIcon,
  pdf: ImgIcon,
  woff: ImgIcon, woff2: ImgIcon, ttf: ImgIcon,
  exe: ConfigIcon, dll: ConfigIcon,
}

export function IconForFile({ name, size = 14 }: { name: string; size?: number }) {
  const fileName = name.toLowerCase()
  const Comp = fileMap[fileName]
  if (Comp) return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex' }}><Comp /></span>

  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : ''
  const ExtComp = extMap[ext]
  if (ExtComp) return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex' }}><ExtComp /></span>

  return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex' }}><FileIcon /></span>
}

export function IconForFolder({ open, size = 14 }: { open?: boolean; size?: number }) {
  const Comp = open ? FolderOpenIcon : FolderIcon
  return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex' }}><Comp /></span>
}
