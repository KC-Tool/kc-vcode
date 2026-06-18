import React, { useRef, useCallback, useEffect, useState } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import { useEditorContext } from '../contexts/EditorContext'
import MarkdownPreview from './MarkdownPreview'
import SettingsView from './SettingsView'
import Breadcrumbs from './Breadcrumbs'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

// custom snippet completions
const snippetCompletions: Record<string, { label: string; insert: string; detail: string }[]> = {
  javascript: [
    { label: 'clg', insert: 'console.log(${1:data})', detail: 'console.log' },
    { label: 'cw', insert: 'console.warn(${1:data})', detail: 'console.warn' },
    { label: 'ce', insert: 'console.error(${1:data})', detail: 'console.error' },
    { label: 'af', insert: 'async function ${1:name}(${2:params}) {\n\t${3:// body}\n}', detail: 'async function' },
    { label: '箭头', insert: '(${1:params}) => {\n\t${2:// body}\n}', detail: 'arrow function' },
    { label: '箭头简', insert: '(${1:params}) => ${2:value}', detail: 'arrow function concise' },
    { label: 'for', insert: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// body}\n}', detail: 'for loop' },
    { label: 'forof', insert: 'for (const ${1:item} of ${2:iterable}) {\n\t${3:// body}\n}', detail: 'for...of' },
    { label: 'forin', insert: 'for (const ${1:key} in ${2:obj}) {\n\t${3:// body}\n}', detail: 'for...in' },
    { label: 'if', insert: 'if (${1:condition}) {\n\t${2:// body}\n}', detail: 'if statement' },
    { label: 'ife', insert: 'if (${1:condition}) {\n\t${2:// true}\n} else {\n\t${3:// false}\n}', detail: 'if/else' },
    { label: 'try', insert: 'try {\n\t${1:// code}\n} catch (${2:err}) {\n\t${3:// handle}\n}', detail: 'try/catch' },
    { label: 'tryf', insert: 'try {\n\t${1:// code}\n} catch (${2:err}) {\n\t${3:// handle}\n} finally {\n\t${4:// cleanup}\n}', detail: 'try/catch/finally' },
    { label: 'imp', insert: "import ${1:module} from '${2:path}'", detail: 'import default' },
    { label: 'impn', insert: "import { ${1:name} } from '${2:path}'", detail: 'import named' },
    { label: 'impa', insert: "import * as ${1:alias} from '${2:path}'", detail: 'import all' },
    { label: 'expd', insert: 'export default ${1:value}', detail: 'export default' },
    { label: 'expn', insert: 'export { ${1:name} }', detail: 'export named' },
    { label: 'promise', insert: 'new Promise((${1:resolve}, ${2:reject}) => {\n\t${3:// code}\n})', detail: 'new Promise' },
    { label: 'tern', insert: '${1:condition} ? ${2:true} : ${3:false}', detail: 'ternary' },
    { label: 'map', insert: '.map((${1:item}) => ${2:item})', detail: '.map()' },
    { label: 'filter', insert: '.filter((${1:item}) => ${2:condition})', detail: '.filter()' },
    { label: 'reduce', insert: '.reduce((${1:acc}, ${2:item}) => {\n\t${3:return acc}\n}, ${4:initialValue})', detail: '.reduce()' },
    { label: 'forEach', insert: '.forEach((${1:item}) => {\n\t${2:// body}\n})', detail: '.forEach()' },
    { label: 'find', insert: '.find((${1:item}) => ${2:condition})', detail: '.find()' },
  ],
  typescript: [
    // basics
    { label: 'clg', insert: 'console.log(${1:data})', detail: 'console.log' },
    { label: 'cw', insert: 'console.warn(${1:data})', detail: 'console.warn' },
    { label: 'ce', insert: 'console.error(${1:data})', detail: 'console.error' },
    { label: 'ci', insert: 'console.info(${1:data})', detail: 'console.info' },
    { label: 'ct', insert: 'console.time(${1:label})\n${2:// code}\nconsole.timeEnd(${1:label})', detail: 'console.time' },
    { label: 'cd', insert: 'console.dir(${1:obj}, { depth: null })', detail: 'console.dir' },
    { label: 'de', insert: 'debugger', detail: 'debugger' },
    // functions
    { label: 'fn', insert: 'function ${1:name}(${2:params}): ${3:void} {\n\t${4:// body}\n}', detail: 'function' },
    { label: 'af', insert: 'async function ${1:name}(${2:params}): Promise<${3:void}> {\n\t${4:// body}\n}', detail: 'async function' },
    { label: 'afn', insert: 'async (${1:params}): Promise<${2:void}> => {\n\t${3:// body}\n}', detail: 'async arrow' },
    { label: '箭头', insert: '(${1:params}): ${2:ReturnType} => {\n\t${3:// body}\n}', detail: 'arrow function' },
    { label: '箭头简', insert: '(${1:params}) => ${2:value}', detail: 'arrow concise' },
    { label: 'iife', insert: '(() => {\n\t${1:// body}\n})()', detail: 'IIFE' },
    { label: 'gen', insert: 'function* ${1:name}() {\n\t${2:// yield}\n}', detail: 'generator' },
    { label: 'overload', insert: 'function ${1:name}(${2:a}: ${3:string}): ${4:string};\nfunction ${1:name}(${5:a}: ${6:number}): ${7:number};\nfunction ${1:name}(${8:a}: any): any {\n\t${9:// body}\n}', detail: 'function overload' },
    // control flow
    { label: 'if', insert: 'if (${1:condition}) {\n\t${2:// body}\n}', detail: 'if' },
    { label: 'ife', insert: 'if (${1:condition}) {\n\t${2:// true}\n} else {\n\t${3:// false}\n}', detail: 'if/else' },
    { label: 'ifee', insert: 'if (${1:condition}) {\n\t${2:// body}\n} else if (${3:condition2}) {\n\t${4:// body}\n} else {\n\t${5:// default}\n}', detail: 'if/else if/else' },
    { label: 'switch', insert: "switch (${1:value}) {\n\tcase '${2:case}':\n\t\t${3:// body}\n\t\tbreak\n\tdefault:\n\t\t${4:// default}\n}", detail: 'switch' },
    { label: 'tern', insert: '${1:condition} ? ${2:true} : ${3:false}', detail: 'ternary' },
    { label: 'guard', insert: "if (${1:value} instanceof ${2:Type}) {\n\t${3:// narrow}\n}", detail: 'instanceof guard' },
    { label: 'in', insert: "if ('${1:key}' in ${2:obj}) {\n\t${3:// has key}\n}", detail: 'in guard' },
    // loops
    { label: 'for', insert: 'for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// body}\n}', detail: 'for loop' },
    { label: 'forof', insert: 'for (const ${1:item} of ${2:iterable}) {\n\t${3:// body}\n}', detail: 'for...of' },
    { label: 'forin', insert: 'for (const ${1:key} in ${2:obj}) {\n\t${3:// body}\n}', detail: 'for...in' },
    { label: 'while', insert: 'while (${1:condition}) {\n\t${2:// body}\n}', detail: 'while' },
    { label: 'dowhile', insert: 'do {\n\t${1:// body}\n} while (${2:condition})', detail: 'do...while' },
    // error handling
    { label: 'try', insert: 'try {\n\t${1:// code}\n} catch (${2:err}: unknown) {\n\t${3:// handle}\n}', detail: 'try/catch' },
    { label: 'tryf', insert: 'try {\n\t${1:// code}\n} catch (${2:err}: unknown) {\n\t${3:// handle}\n} finally {\n\t${4:// cleanup}\n}', detail: 'try/catch/finally' },
    { label: 'tryret', insert: 'try {\n\t${1:// code}\n\treturn ${2:result}\n} catch (${3:err}: unknown) {\n\treturn ${4:fallback}\n}', detail: 'try with return' },
    // imports/exports
    { label: 'imp', insert: "import { ${1:name} } from '${2:path}'", detail: 'import named' },
    { label: 'impd', insert: "import ${1:name} from '${2:path}'", detail: 'import default' },
    { label: 'impa', insert: "import * as ${1:alias} from '${2:path}'", detail: 'import all' },
    { label: 'impt', insert: "import type { ${1:name} } from '${2:path}'", detail: 'import type' },
    { label: 'impr', insert: "import ${1:name} from '${2:path}' assert { type: 'json' }", detail: 'import json' },
    { label: 'exp', insert: 'export { ${1:name} }', detail: 'export named' },
    { label: 'expd', insert: 'export default ${1:value}', detail: 'export default' },
    { label: 'expf', insert: 'export function ${1:name}(${2:params}): ${3:void} {\n\t${4:// body}\n}', detail: 'export function' },
    { label: 'expi', insert: 'export interface ${1:Name} {\n\t${2:key}: ${3:type}\n}', detail: 'export interface' },
    { label: 'expt', insert: 'export type ${1:Name} = ${2:type}', detail: 'export type' },
    { label: 'reexp', insert: "export { ${1:name} } from '${2:path}'", detail: 're-export' },
    // types
    { label: 'int', insert: 'interface ${1:Name} {\n\t${2:key}: ${3:type}\n}', detail: 'interface' },
    { label: 'intx', insert: 'interface ${1:Name} extends ${2:Base} {\n\t${3:key}: ${4:type}\n}', detail: 'interface extends' },
    { label: 'type', insert: 'type ${1:Name} = ${2:type}', detail: 'type alias' },
    { label: 'union', insert: 'type ${1:Name} = ${2:A} | ${3:B}', detail: 'union type' },
    { label: 'inter', insert: 'type ${1:Name} = ${2:A} & ${3:B}', detail: 'intersection' },
    { label: 'generic', insert: 'function ${1:name}<${2:T}>(${3:arg}: ${2:T}): ${2:T} {\n\t${4:// body}\n}', detail: 'generic function' },
    { label: 'genericc', insert: 'class ${1:Name}<${2:T}> {\n\t${3:private} ${4:data}: ${2:T}\n\n\tconstructor(${5:data}: ${2:T}) {\n\t\tthis.${5:data} = ${5:data}\n\t}\n}', detail: 'generic class' },
    { label: 'constraint', insert: '<${1:T} extends ${2:string}>', detail: 'generic constraint' },
    { label: 'mapped', insert: 'type ${1:Name}<T> = {\n\t[K in keyof T]: ${2:T[K]}\n}', detail: 'mapped type' },
    { label: 'conditional', insert: 'type ${1:Name}<T> = ${2:T} extends ${3:string} ? ${4:Yes} : ${5:No}', detail: 'conditional type' },
    { label: 'template', insert: 'type ${1:Name} = `${2:a}-${3:b}`', detail: 'template literal type' },
    { label: 'extract', insert: 'type ${1:Name} = ${2:Union} extends ${3:Pattern} ? ${2:Union} : never', detail: 'extract type' },
    { label: 'exclude', insert: 'type ${1:Name} = ${2:Union} extends ${3:Pattern} ? never : ${2:Union}', detail: 'exclude type' },
    { label: 'pick', insert: 'type ${1:Name} = Pick<${2:T}, ${3:keyof ${2:T}}>', detail: 'Pick' },
    { label: 'omit', insert: 'type ${1:Name} = Omit<${2:T}, ${3:keyof ${2:T}}>', detail: 'Omit' },
    { label: 'partial', insert: 'type ${1:Name} = Partial<${2:T}>', detail: 'Partial' },
    { label: 'required', insert: 'type ${1:Name} = Required<${2:T}>', detail: 'Required' },
    { label: 'readonly', insert: 'type ${1:Name} = Readonly<${2:T}>', detail: 'Readonly' },
    { label: 'record', insert: 'type ${1:Name} = Record<${2:string}, ${3:any}>', detail: 'Record' },
    { label: 'promise', insert: 'Promise<${1:void}>', detail: 'Promise type' },
    { label: 'promiseret', insert: 'new Promise<${1:void}>((resolve, reject) => {\n\t${2:// body}\n})', detail: 'new Promise' },
    { label: 'await', insert: 'const ${1:result} = await ${2:promise}', detail: 'await' },
    { label: 'para', insert: 'type ${1:Name} = Parameters<${2:typeof fn}>', detail: 'Parameters' },
    { label: 'rett', insert: 'type ${1:Name} = ReturnType<${2:typeof fn}>', detail: 'ReturnType' },
    { label: 'keysof', insert: 'keyof ${1:T}', detail: 'keyof' },
    { label: 'valof', insert: '${1:T}[keyof ${1:T}]', detail: 'value of' },
    { label: 'typeof', insert: 'typeof ${1:value}', detail: 'typeof' },
    { label: 'nonull', insert: '${1:value}!', detail: 'non-null assertion' },
    { label: 'as', insert: '${1:value} as ${2:Type}', detail: 'type assertion' },
    // classes
    { label: 'cls', insert: 'class ${1:Name} {\n\t${2:// fields}\n\n\tconstructor(${3:params}) {\n\t\t${4:// init}\n\t}\n}', detail: 'class' },
    { label: 'clse', insert: 'class ${1:Name} extends ${2:Base} {\n\tconstructor(${3:params}) {\n\t\tsuper(${4:params})\n\t\t${5:// init}\n\t}\n}', detail: 'class extends' },
    { label: 'clsi', insert: 'class ${1:Name} implements ${2:Interface} {\n\t${3:// impl}\n}', detail: 'class implements' },
    { label: 'abs', insert: 'abstract class ${1:Name} {\n\tabstract ${2:method}(${3:params}): ${4:void}\n}', detail: 'abstract class' },
    { label: 'priv', insert: 'private ${1:name}: ${2:type}', detail: 'private field' },
    { label: 'prot', insert: 'protected ${1:name}: ${2:type}', detail: 'protected field' },
    { label: 'stat', insert: 'static ${1:name}: ${2:type}', detail: 'static field' },
    { label: 'get', insert: 'get ${1:name}(): ${2:type} {\n\treturn this._${1:name}\n}', detail: 'getter' },
    { label: 'set', insert: 'set ${1:name}(value: ${2:type}) {\n\tthis._${1:name} = value\n}', detail: 'setter' },
    { label: 'readonlyf', insert: 'readonly ${1:name}: ${2:type}', detail: 'readonly field' },
    { label: 'prop', insert: '${1:name} = ${2:value}', detail: 'property initializer' },
    // array methods
    { label: 'map', insert: '.map((${1:item}) => ${2:item})', detail: '.map()' },
    { label: 'filter', insert: '.filter((${1:item}) => ${2:condition})', detail: '.filter()' },
    { label: 'reduce', insert: '.reduce((${1:acc}, ${2:item}) => {\n\t${3:return acc}\n}, ${4:init})', detail: '.reduce()' },
    { label: 'find', insert: '.find((${1:item}) => ${2:condition})', detail: '.find()' },
    { label: 'findi', insert: '.findIndex((${1:item}) => ${2:condition})', detail: '.findIndex()' },
    { label: 'some', insert: '.some((${1:item}) => ${2:condition})', detail: '.some()' },
    { label: 'every', insert: '.every((${1:item}) => ${2:condition})', detail: '.every()' },
    { label: 'foreach', insert: '.forEach((${1:item}, ${2:i}) => {\n\t${3:// body}\n})', detail: '.forEach()' },
    { label: 'flat', insert: '.flat(${1:1})', detail: '.flat()' },
    { label: 'flatmap', insert: '.flatMap((${1:item}) => ${2:mapped})', detail: '.flatMap()' },
    { label: 'sort', insert: '.sort((${1:a}, ${2:b}) => ${1:a}.localeCompare(${2:b}))', detail: '.sort()' },
    { label: 'includes', insert: '.includes(${1:value})', detail: '.includes()' },
    { label: 'indexof', insert: '.indexOf(${1:value})', detail: '.indexOf()' },
    { label: 'slice', insert: '.slice(${1:start}, ${2:end})', detail: '.slice()' },
    { label: 'splice', insert: '.splice(${1:idx}, ${2:count})', detail: '.splice()' },
    { label: 'concat', insert: '.concat(${1:other})', detail: '.concat()' },
    { label: 'join', insert: '.join(${1:", "})', detail: '.join()' },
    { label: 'split', insert: '.split(${1:delimiter})', detail: '.split()' },
    { label: 'replace', insert: '.replace(${1:search}, ${2:replace})', detail: '.replace()' },
    { label: 'trim', insert: '.trim()', detail: '.trim()' },
    { label: 'tolower', insert: '.toLowerCase()', detail: '.toLowerCase()' },
    { label: 'toupper', insert: '.toUpperCase()', detail: '.toUpperCase()' },
    { label: 'padstart', insert: '.padStart(${1:length}, ${2:"0"})', detail: '.padStart()' },
    { label: 'match', insert: '.match(${1:/regex/})', detail: '.match()' },
    { label: 'matchall', insert: '.matchAll(${1:/regex/})', detail: '.matchAll()' },
    { label: 'startswith', insert: '.startsWith(${1:value})', detail: '.startsWith()' },
    { label: 'endswith', insert: '.endsWith(${1:value})', detail: '.endsWith()' },
    { label: 'repeat', insert: '.repeat(${1:count})', detail: '.repeat()' },
    // object methods
    { label: 'keys', insert: 'Object.keys(${1:obj})', detail: 'Object.keys' },
    { label: 'values', insert: 'Object.values(${1:obj})', detail: 'Object.values' },
    { label: 'entries', insert: 'Object.entries(${1:obj})', detail: 'Object.entries' },
    { label: 'fromentries', insert: 'Object.fromEntries(${1:entries})', detail: 'Object.fromEntries' },
    { label: 'assign', insert: 'Object.assign(${1:target}, ${2:source})', detail: 'Object.assign' },
    { label: 'freeze', insert: 'Object.freeze(${1:obj})', detail: 'Object.freeze' },
    { label: 'create', insert: 'Object.create(${1:prototype})', detail: 'Object.create' },
    { label: 'defineprop', insert: 'Object.defineProperty(${1:obj}, ${2:prop}, {\n\tvalue: ${3:value},\n\tenumerable: ${4:true},\n\twritable: ${5:true},\n\tconfigurable: ${6:true}\n})', detail: 'Object.defineProperty' },
    // promise patterns
    { label: 'pall', insert: 'Promise.all([${1:p1}, ${2:p2}])', detail: 'Promise.all' },
    { label: 'pallset', insert: 'Promise.allSettled([${1:p1}, ${2:p2}])', detail: 'Promise.allSettled' },
    { label: 'prace', insert: 'Promise.race([${1:p1}, ${2:p2}])', detail: 'Promise.race' },
    { label: 'pany', insert: 'Promise.any([${1:p1}, ${2:p2}])', detail: 'Promise.any' },
    { label: 'presolve', insert: 'Promise.resolve(${1:value})', detail: 'Promise.resolve' },
    { label: 'preject', insert: 'Promise.reject(${1:reason})', detail: 'Promise.reject' },
    // utility types
    { label: 'asserts', insert: 'asserts ${1:value} is ${2:Type}', detail: 'asserts is' },
    { label: 'infer', insert: 'infer ${1:T}', detail: 'infer' },
    { label: 'never', insert: 'throw new Error(${1:"not implemented"})', detail: 'throw never' },
    { label: 'noop', insert: '() => {}', detail: 'no-op function' },
    { label: 'identity', insert: '(x: ${1:T}) => x', detail: 'identity function' },
    // electron / node
    { label: 'ipcHandle', insert: "ipcMain.handle('${1:channel}', async (_, ${2:args}) => {\n\t${3:// handler}\n})", detail: 'ipcMain.handle' },
    { label: 'ipcOn', insert: "ipcMain.on('${1:channel}', (_, ${2:args}) => {\n\t${3:// handler}\n})", detail: 'ipcMain.on' },
    { label: 'ipcInvoke', insert: "ipcRenderer.invoke('${1:channel}', ${2:data})", detail: 'ipcRenderer.invoke' },
    { label: 'ipcSend', insert: "ipcRenderer.send('${1:channel}', ${2:data})", detail: 'ipcRenderer.send' },
    { label: 'bw', insert: 'new BrowserWindow({\n\twidth: ${1:800},\n\theight: ${2:600},\n\twebPreferences: {\n\t\tpreload: ${3:path.join(__dirname, "preload.js")},\n\t\tcontextIsolation: ${4:true},\n\t\tsandbox: ${5:false}\n\t}\n})', detail: 'new BrowserWindow' },
    { label: 'dialog', insert: "dialog.showOpenDialog(${1:win}, {\n\tproperties: ['${2:openFile}']\n})", detail: 'dialog.showOpenDialog' },
    { label: 'readFile', insert: "fs.readFileSync(${1:path}, '${2:utf-8}')", detail: 'fs.readFileSync' },
    { label: 'writeFile', insert: "fs.writeFileSync(${1:path}, ${2:data}, '${3:utf-8}')", detail: 'fs.writeFileSync' },
    { label: 'readDir', insert: "fs.readdirSync(${1:path}, { withFileTypes: ${2:true} })", detail: 'fs.readdirSync' },
    { label: 'mkdir', insert: "fs.mkdirSync(${1:path}, { recursive: ${2:true} })", detail: 'fs.mkdirSync' },
    { label: 'exists', insert: "fs.existsSync(${1:path})", detail: 'fs.existsSync' },
    { label: 'watch', insert: "fs.watch(${1:path}, (${2:event}, ${3:filename}) => {\n\t${4:// handler}\n})", detail: 'fs.watch' },
    { label: 'spawn', insert: "child_process.spawn(${1:command}, ${2:args}, {\n\tcwd: ${3:process.cwd()},\n\tstdio: 'pipe'\n})", detail: 'child_process.spawn' },
    { label: 'exec', insert: "child_process.exec(${1:command}, (err, stdout, stderr) => {\n\t${2:// handle}\n})", detail: 'child_process.exec' },
    // react hooks
    { label: 'useState', insert: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initial})', detail: 'useState' },
    { label: 'useEffect', insert: 'useEffect(() => {\n\t${1:// effect}\n\treturn () => {\n\t\t${2:// cleanup}\n\t}\n}, [${3:deps}])', detail: 'useEffect' },
    { label: 'useCallback', insert: 'useCallback((${1:params}) => {\n\t${2:// body}\n}, [${3:deps}])', detail: 'useCallback' },
    { label: 'useMemo', insert: 'useMemo(() => {\n\treturn ${1:value}\n}, [${2:deps}])', detail: 'useMemo' },
    { label: 'useRef', insert: 'const ${1:ref} = useRef<${2:type}>(${3:initialValue})', detail: 'useRef' },
    { label: 'useReducer', insert: 'const [state, dispatch] = useReducer(${1:reducer}, ${2:initialState})', detail: 'useReducer' },
    { label: 'useContext', insert: 'const ${1:value} = useContext(${2:Context})', detail: 'useContext' },
    { label: 'useImperativeHandle', insert: 'useImperativeHandle(${1:ref}, () => ({\n\t${2:// exposed methods}\n}))', detail: 'useImperativeHandle' },
    { label: 'useLayoutEffect', insert: 'useLayoutEffect(() => {\n\t${1:// effect}\n}, [${2:deps}])', detail: 'useLayoutEffect' },
    // react components
    { label: 'rfc', insert: 'export default function ${1:Name}(${2:props}: ${3:Props}) {\n\treturn (\n\t\t<div>\n\t\t\t${4:// content}\n\t\t</div>\n\t)\n}', detail: 'React function component' },
    { label: 'rfcp', insert: 'interface ${1:Name}Props {\n\t${2:// props}\n}\n\nexport default function ${1:Name}({ ${3:props} }: ${1:Name}Props) {\n\treturn (\n\t\t<div>\n\t\t\t${4:// content}\n\t\t</div>\n\t)\n}', detail: 'React component with props' },
    { label: 'rfce', insert: 'import React from "react"\n\ninterface ${1:Name}Props {\n\t${2:// props}\n}\n\nconst ${1:Name}: React.FC<${1:Name}Props> = ({ ${3:props} }) => {\n\treturn (\n\t\t<div>\n\t\t\t${4:// content}\n\t\t</div>\n\t)\n}\n\nexport default ${1:Name}', detail: 'React FC component' },
    { label: 'useStatecb', insert: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(() => {\n\t${2:// init}\n})', detail: 'useState lazy init' },
    { label: 'forwardRef', insert: 'const ${1:Name} = React.forwardRef<${2:Type}, ${3:Props}>((props, ref) => {\n\treturn <div ref={ref}>${4}</div>\n})', detail: 'forwardRef' },
    { label: 'memo', insert: 'const ${1:Name} = React.memo(function ${1:Name}(${2:props}) {\n\treturn (${3:<div />})\n})', detail: 'React.memo' },
    { label: 'lazy', insert: 'const ${1:Name} = React.lazy(() => import("${2:./Component}"))', detail: 'React.lazy' },
    { label: 'suspense', insert: '<React.Suspense fallback={${1:<div>Loading...</div>}}>\n\t${2:<Component />}\n</React.Suspense>', detail: 'Suspense' },
    { label: 'useeffectmount', insert: 'useEffect(() => {\n\t${1:// runs once on mount}\n}, [])', detail: 'useEffect mount only' },
    { label: 'usedebounce', insert: 'const [debouncedValue, setDebouncedValue] = useState(${1:value})\n\nuseEffect(() => {\n\tconst timer = setTimeout(() => setDebouncedValue(${1:value}), ${2:300})\n\treturn () => clearTimeout(timer)\n}, [${1:value}])', detail: 'debounce pattern' },
    { label: 'usethrottle', insert: 'const lastRun = useRef(Date.now())\n\nuseEffect(() => {\n\tconst timeout = setTimeout(() => {\n\t\tif (Date.now() - lastRun.current >= ${1:1000}) {\n\t\t\t${2:// handler}\n\t\t\tlastRun.current = Date.now()\n\t\t}\n\t}, ${1:1000} - (Date.now() - lastRun.current))\n\treturn () => clearTimeout(timeout)\n}, [${2:deps}])', detail: 'throttle pattern' },
  ],
  python: [
    { label: 'def', insert: 'def ${1:name}(${2:params}):\n\t${3:pass}', detail: 'function definition' },
    { label: 'adef', insert: 'async def ${1:name}(${2:params}):\n\t${3:pass}', detail: 'async function' },
    { label: 'cls', insert: 'class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}', detail: 'class' },
    { label: 'for', insert: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', detail: 'for loop' },
    { label: 'if', insert: 'if ${1:condition}:\n\t${2:pass}', detail: 'if statement' },
    { label: 'ife', insert: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}', detail: 'if/else' },
    { label: 'try', insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}', detail: 'try/except' },
    { label: 'with', insert: 'with ${1:expression} as ${2:var}:\n\t${3:pass}', detail: 'with statement' },
    { label: 'lambda', insert: 'lambda ${1:params}: ${2:expression}', detail: 'lambda' },
    { label: 'print', insert: 'print(${1:value})', detail: 'print' },
    { label: 'main', insert: "if __name__ == '__main__':\n\t${1:main()}", detail: 'main guard' },
  ],
  html: [
    { label: 'div', insert: '<div>\n\t${1:content}\n</div>', detail: 'div element' },
    { label: 'span', insert: '<span>${1:content}</span>', detail: 'span element' },
    { label: 'a', insert: '<a href="${1:url}">${2:text}</a>', detail: 'anchor' },
    { label: 'img', insert: '<img src="${1:src}" alt="${2:alt}" />', detail: 'image' },
    { label: 'ul', insert: '<ul>\n\t<li>${1:item}</li>\n</ul>', detail: 'unordered list' },
    { label: 'table', insert: '<table>\n\t<tr>\n\t\t<th>${1:header}</th>\n\t</tr>\n\t<tr>\n\t\t<td>${2:data}</td>\n\t</tr>\n</table>', detail: 'table' },
    { label: 'input', insert: '<input type="${1:text}" name="${2:name}" placeholder="${3:placeholder}" />', detail: 'input' },
    { label: 'button', insert: '<button type="${1:button}">${2:label}</button>', detail: 'button' },
    { label: 'form', insert: '<form action="${1:url}" method="${2:post}">\n\t${3:content}\n</form>', detail: 'form' },
  ],
  css: [
    { label: 'flex', insert: 'display: flex;\nalign-items: center;\njustify-content: center;', detail: 'flexbox center' },
    { label: 'flexc', insert: 'display: flex;\nflex-direction: column;', detail: 'flex column' },
    { label: 'grid', insert: 'display: grid;\ngrid-template-columns: ${1:1fr};\ngap: ${2:16px};', detail: 'grid layout' },
    { label: 'abs', insert: 'position: absolute;\ntop: 0;\nleft: 0;\nright: 0;\nbottom: 0;', detail: 'absolute fill' },
    { label: 'fixed', insert: 'position: fixed;\ntop: 0;\nleft: 0;\nright: 0;\nbottom: 0;', detail: 'fixed fill' },
    { label: 'transition', insert: 'transition: ${1:all} ${2:200ms} ${3:ease}', detail: 'transition' },
    { label: 'shadow', insert: 'box-shadow: 0 ${1:2}px ${2:8}px rgba(0, 0, 0, ${3:0.1})', detail: 'box shadow' },
  ],
  go: [
    { label: 'main', insert: 'func main() {\n\t${1:// body}\n}', detail: 'main function' },
    { label: 'func', insert: 'func ${1:name}(${2:params}) ${3:ReturnType} {\n\t${4:// body}\n}', detail: 'function' },
    { label: 'method', insert: 'func (${1:receiver} *${2:Type}) ${3:Name}(${4:params}) ${5:ReturnType} {\n\t${6:// body}\n}', detail: 'method' },
    { label: 'if', insert: 'if ${1:condition} {\n\t${2:// body}\n}', detail: 'if' },
    { label: 'for', insert: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${3:// body}\n}', detail: 'for loop' },
    { label: 'forr', insert: 'for ${1:i}, ${2:v} := range ${3:collection} {\n\t${4:// body}\n}', detail: 'for range' },
    { label: 'struct', insert: 'type ${1:Name} struct {\n\t${2:Field} ${3:Type}\n}', detail: 'struct' },
    { label: 'err', insert: 'if err != nil {\n\t${1:return err}\n}', detail: 'error check' },
  ],
  rust: [
    { label: 'fn', insert: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t${4:// body}\n}', detail: 'function' },
    { label: 'main', insert: 'fn main() {\n\t${1:// body}\n}', detail: 'main function' },
    { label: 'pub', insert: 'pub fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t${4:// body}\n}', detail: 'public function' },
    { label: 'impl', insert: 'impl ${1:Type} {\n\t${2:// methods}\n}', detail: 'impl block' },
    { label: 'struct', insert: 'struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}', detail: 'struct' },
    { label: 'enum', insert: 'enum ${1:Name} {\n\t${2:Variant},\n}', detail: 'enum' },
    { label: 'match', insert: 'match ${1:value} {\n\t${2:pattern} => ${3:result},\n\t_ => ${4:default}\n}', detail: 'match' },
    { label: 'iflet', insert: 'if let ${1:Some(value)} = ${2:option} {\n\t${3:// body}\n}', detail: 'if let' },
    { label: 'vec', insert: 'vec![${1:values}]', detail: 'vec! macro' },
    { label: 'dbg', insert: 'dbg!(&${1:value})', detail: 'dbg! macro' },
  ],
}

export default function EditorPane() {
  const { state, updateContent, markSaved, setCursor } = useEditorContext()
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<any>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const activeFile = state.activeTabId ? state.files[state.activeTabId] : null
  const isMarkdown = activeFile?.language === 'markdown'

  const handleSave = useCallback(async () => {
    if (!activeFile) return
    const result = await window.electronAPI.saveFile({
      path: activeFile.path,
      content: activeFile.content
    })
    if ('success' in result && result.success) markSaved(activeFile.path)
  }, [activeFile, markSaved])

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    editor.onDidChangeCursorPosition((e) => {
      if (activeFile) setCursor(activeFile.path, e.position.lineNumber, e.position.column)
    })

    editor.addCommand(2048 | 49, () => handleSave())

    // register custom completions per language
    for (const [lang, snippets] of Object.entries(snippetCompletions)) {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          }
          return {
            suggestions: snippets.map(s => ({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: s.insert,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: s.detail,
              range
            }))
          }
        }
      })
    }

    // tab completion with diff decoration
    editor.addAction({
      id: 'tab-complete-diff',
      label: 'Tab Complete',
      keybindings: [9], // Tab key
      run: (ed) => {
        const model = ed.getModel()
        if (!model) return

        const pos = ed.getPosition()
        if (!pos) return

        // check if suggest widget is open
        const suggestController = ed.getContribution('editor.contrib.suggestController')
        if (suggestController && (suggestController as any)._suggestWidget?.isVisible()) {
          // let suggest widget handle it normally
          ed.trigger('keyboard', 'editor.action.suggestInsert', null)
          return
        }

        // no suggest open — insert tab
        ed.trigger('keyboard', 'editor.action.insertTab', null)
      }
    })

    editor.focus()
  }, [activeFile, handleSave, setCursor])

  // show diff decoration after completion insert
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    let decoIds: string[] = []
    let timer: ReturnType<typeof setTimeout> | null = null

    const disposable = editor.onDidChangeModelContent((e) => {
      if (!e.changes.length) return
      // find insertions that span multiple lines (snippet inserts)
      for (const change of e.changes) {
        const insertedLines = change.text.split('\n').length
        if (insertedLines > 1) {
          const startLine = change.range.startLineNumber
          const endLine = startLine + insertedLines - 1
          const model = editor.getModel()
          if (!model) return

          // clear old decorations
          decoIds = editor.deltaDecorations(decoIds, [
            {
              range: new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine)),
              options: {
                isWholeLine: true,
                className: 'diff-highlight',
                overviewRuler: { color: '#a6e3a1', position: 1 }
              }
            }
          ])

          // auto-clear after 2s
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            decoIds = editor.deltaDecorations(decoIds, [])
          }, 2000)
        }
      }
    })

    return () => {
      disposable.dispose()
      if (timer) clearTimeout(timer)
    }
  }, [state.activeTabId])

  useEffect(() => {
    if (editorRef.current && activeFile) editorRef.current.focus()
  }, [state.activeTabId])

  // sync monaco theme with app theme
  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco) return
    monaco.editor.setTheme(state.theme === 'dark' ? 'vs-dark' : 'vs')
  }, [state.theme])

  useEffect(() => {
    window.electronAPI.onRequestSave(() => handleSave())
    return () => { window.electronAPI.removeAllListeners('file:requestSave') }
  }, [handleSave])

  // Go to Line
  useEffect(() => {
    const handler = (e: Event) => {
      const line = (e as CustomEvent).detail
      if (editorRef.current && typeof line === 'number') {
        editorRef.current.revealLineInCenter(line)
        editorRef.current.setPosition({ lineNumber: line, column: 1 })
        editorRef.current.focus()
      }
    }
    document.addEventListener('editor:goToLine', handler)
    return () => document.removeEventListener('editor:goToLine', handler)
  }, [state.activeTabId])

  // settings tab — no file data needed
  const isSettings = state.tabs.find(t => t.id === state.activeTabId)?.isSettings
  if (isSettings) {
    return (
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <SettingsView />
      </div>
    )
  }

  if (!activeFile) return null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Breadcrumbs />
      {isMarkdown && (
        <div className="editor-toolbar">
          <button
            className={`editor-toolbar-btn${!previewMode ? ' editor-toolbar-btn--active' : ''}`}
            onClick={() => setPreviewMode(false)}
          >
            Edit
          </button>
          <button
            className={`editor-toolbar-btn${previewMode ? ' editor-toolbar-btn--active' : ''}`}
            onClick={() => setPreviewMode(true)}
          >
            Preview
          </button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isMarkdown && previewMode ? (
          <MarkdownPreview content={activeFile.content} theme={state.theme} />
        ) : (
          <Editor
            key={activeFile.path}
            height="100%"
            language={activeFile.language}
            value={activeFile.content}
            theme="vs-dark"
            onChange={(v) => { if (v !== undefined) updateContent(activeFile.path, v) }}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
              fontLigatures: true,
              minimap: { enabled: true },
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              bracketPairColorization: { enabled: true },
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              formatOnPaste: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: { enabled: true },
              folding: true,
              foldingHighlight: true,
              guides: { indentation: true, bracketPairs: true },
              selectionHighlight: true,
              occurrencesHighlight: 'singleFile',
              renderLineHighlight: 'all',
              padding: { top: 8 },
              suggestSelection: 'first',
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'on',
              snippetSuggestions: 'inline',
              tabCompletion: 'on'
            }}
          />
        )}
      </div>
    </div>
  )
}
