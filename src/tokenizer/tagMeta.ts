import type { AttributeValue } from '../types';

export function tagMeta(
  name: string,
  attributes?: Record<string, any>
): { tag: string; attributes?: AttributeValue[] } {
  if (!attributes || Object.keys(attributes).length === 0) return { tag: name };
  return {
    tag: name,
    attributes: Object.entries(attributes).map(([attrName, value]) => ({
      type: 'attribute',
      name: attrName,
      value,
    })),
  };
}
