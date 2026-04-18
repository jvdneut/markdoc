# `validateChildren` schema hook

## Problem

Markdoc's `validateTree` walks the static AST with the original top-level config. This means tags that establish a scoped variable context at render time — such as loop tags — will produce spurious `variable-undefined` errors for variables that only exist inside the loop (e.g. `$this.firstName`).

## Solution

The `validateChildren` hook lets a tag schema inject an augmented config before the validator descends into its children. This is the validation-time counterpart to `resolveChildren`.

## API

```typescript
type Schema = {
  // ...
  validateChildren?(node: Node, config: Config): Config;
};
```

The function receives the tag node and the current config, and returns the config to use when validating the tag's children (and their descendants).

## Example: loop tag

```typescript
export const loop: Schema = {
  resolveChildren: false,

  validateChildren(node, config) {
    // Inject $this using the first item from the data array so that
    // nested paths like $this.firstName validate correctly.
    const items = config.variables?.[node.attributes.itemsVar] ?? [];
    const sample = Array.isArray(items) ? items[0] : {};
    return {
      ...config,
      variables: { ...config.variables, this: sample },
    };
  },

  transform(node, config) {
    const items = /* resolve items from config */ [];
    return items.flatMap((item) => {
      const scopedConfig = {
        ...config,
        variables: { ...config.variables, this: item },
      };
      return node.children.map((child) =>
        child.resolve(scopedConfig).transform(scopedConfig)
      );
    });
  },
};
```

## How it works

`walkWithParents` in `src/validator.ts` now threads a `Config` through the tree. When it visits a node, it checks whether the node's schema has `validateChildren`. If so, the returned config is used for all descendants of that node — not just direct children.

This means deeply nested variable references (e.g. `$this.address.city`) also validate correctly as long as the injected sample value has the matching shape.
