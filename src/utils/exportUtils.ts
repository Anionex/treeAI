import { Session, ChatNode } from '../types';

interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
}

export function exportToMindmap(session: Session): void {
  try {
    // Build a tree structure for the mind map
    const mindMapTree = buildMindMapTree(session);
    
    // Convert to a format suitable for export (e.g., FreeMind, XMind, etc.)
    const xmlContent = convertToFreeMindXML(mindMapTree, session.title);
    
    // Create a downloadable file
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_mindmap.mm`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Failed to export mind map:', error);
    alert('Failed to export mind map. See console for details.');
  }
}

function buildMindMapTree(session: Session): MindMapNode {
  // Find the root node (system prompt)
  const rootNode = session.nodes.find(n => n.type === 'system');
  if (!rootNode) {
    throw new Error('No system node found as root');
  }
  
  // Build a map for faster lookup
  const nodeMap = new Map<string, ChatNode>();
  session.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });
  
  // Create child node map
  const childrenMap = new Map<string, string[]>();
  session.nodes.forEach(node => {
    if (node.parentId) {
      if (!childrenMap.has(node.parentId)) {
        childrenMap.set(node.parentId, []);
      }
      childrenMap.get(node.parentId)?.push(node.id);
    }
  });
  
  // Recursively build the tree
  const buildSubtree = (nodeId: string): MindMapNode => {
    const node = nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    const text = node.type === 'system' 
      ? 'System Prompt: ' + truncateText(node.userMessage, 100)
      : truncateText(node.userMessage, 100);
    
    const mindMapNode: MindMapNode = {
      id: node.id,
      text
    };
    
    const childIds = childrenMap.get(nodeId) || [];
    if (childIds.length > 0) {
      mindMapNode.children = childIds.map(id => buildSubtree(id));
    }
    
    return mindMapNode;
  };
  
  return buildSubtree(rootNode.id);
}

function convertToFreeMindXML(root: MindMapNode, title: string): string {
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const mapStart = '<map version="1.0.1">';
  const mapEnd = '</map>';
  
  const buildNodeXML = (node: MindMapNode, isRoot: boolean = false): string => {
    const nodeStart = isRoot 
      ? `<node ID="${node.id}" TEXT="${escapeXml(title)}" CREATED="${Date.now()}" MODIFIED="${Date.now()}">`
      : `<node ID="${node.id}" TEXT="${escapeXml(node.text)}" CREATED="${Date.now()}" MODIFIED="${Date.now()}">`;
    
    let content = nodeStart;
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        content += buildNodeXML(child);
      }
    }
    
    content += '</node>';
    return content;
  };
  
  const xml = `${xmlHeader}\n${mapStart}\n${buildNodeXML(root, true)}\n${mapEnd}`;
  return xml;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}