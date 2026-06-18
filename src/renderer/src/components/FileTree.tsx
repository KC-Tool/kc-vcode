import React, { useState, useCallback } from 'react'
import { FileNode } from '../../../preload/index'
import { IconForFile, IconForFolder } from '../utils/fileIcons'

interface FileTreeProps {
  tree: FileNode[]
  onFileClick: (node: FileNode) => void
  depth?: number
}

function FileTreeItem({ node, onFileClick, depth = 0 }: { node: FileNode; onFileClick: (node: FileNode) => void; depth: number }) {
  const [expanded, setExpanded] = useState(false)
  const isDir = node.type === 'directory'

  const handleClick = useCallback(() => {
    if (isDir) setExpanded(!expanded)
    else onFileClick(node)
  }, [isDir, expanded, node, onFileClick])

  return (
    <div>
      <div
        className="file-tree-item"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        title={node.path}
      >
        {isDir && (
          <span className={`file-tree-arrow${expanded ? ' file-tree-arrow--expanded' : ''}`}>▶</span>
        )}
        <span className="file-tree-icon">
          {isDir ? null : <IconForFile name={node.name} />}
        </span>
        <span className="file-tree-name">{node.name}</span>
      </div>
      {isDir && (
        <div className={`file-tree-children${expanded ? ' file-tree-children--open' : ''}`}>
          {node.children && (
            <FileTreeItems nodes={node.children} onFileClick={onFileClick} depth={depth + 1} />
          )}
        </div>
      )}
    </div>
  )
}

function FileTreeItems({ nodes, onFileClick, depth }: { nodes: FileNode[]; onFileClick: (node: FileNode) => void; depth: number }) {
  return (
    <div>
      {nodes.map(node => (
        <FileTreeItem key={node.path} node={node} onFileClick={onFileClick} depth={depth} />
      ))}
    </div>
  )
}

export default function FileTree({ tree, onFileClick, depth = 0 }: FileTreeProps) {
  return (
    <div className="file-tree">
      <FileTreeItems nodes={tree} onFileClick={onFileClick} depth={depth} />
    </div>
  )
}
