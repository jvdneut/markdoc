import Node from './ast/node';
import type { Config } from './types';

function parseExtends(frontmatter?: string): string | undefined {
  const match = frontmatter?.match(/^extends:\s*['"]?([^\s'"#]+)['"]?/m);
  return match?.[1];
}

function collectBlocks(node: Node): Record<string, Node> {
  const blocks: Record<string, Node> = {};
  for (const child of node.walk()) {
    if (child.tag === 'block' && typeof child.attributes.name === 'string') {
      blocks[child.attributes.name] = child;
    }
  }
  return blocks;
}

function substituteBlocks(node: Node, blocks: Record<string, Node>): Node {
  if (node.tag === 'block' && node.attributes.name in blocks) {
    return Object.assign(new Node(), node, {
      children: blocks[node.attributes.name].children,
    });
  }
  return Object.assign(new Node(), node, {
    children: node.children.map((c) => substituteBlocks(c, blocks)),
    slots: Object.fromEntries(
      Object.entries(node.slots).map(([k, v]) => [k, substituteBlocks(v, blocks)])
    ),
  });
}

function resolveChain(
  node: Node,
  config: Config,
  childBlocks: Record<string, Node>
): Node {
  const thisBlocks = collectBlocks(node);
  // Descendant (child) blocks take priority over ancestor blocks
  const mergedBlocks = { ...thisBlocks, ...childBlocks };

  const extendsFile = parseExtends(node.attributes?.frontmatter);
  if (!extendsFile) {
    return substituteBlocks(node, mergedBlocks);
  }

  const base = config.templates?.[extendsFile];
  if (!base) {
    return Object.assign(new Node(), node, {
      errors: [
        ...(node.errors ?? []),
        {
          id: 'template-not-found',
          level: 'critical' as const,
          message: `Template '${extendsFile}' not found in config.templates`,
        },
      ],
    });
  }

  return resolveChain(base, config, mergedBlocks);
}

export function resolveInheritance(node: Node, config: Config): Node {
  return resolveChain(node, config, {});
}
