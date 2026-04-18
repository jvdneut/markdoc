import type { Schema } from '../types';

export const block: Schema = {
  attributes: {
    name: { type: String, required: true },
  },
  transform(node, config) {
    return node.transformChildren(config);
  },
};
