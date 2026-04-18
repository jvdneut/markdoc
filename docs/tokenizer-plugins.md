# Tokenizer plugins

The `Tokenizer` exposes a `use()` method that registers markdown-it plugins, letting you extend the syntax Markdoc understands without forking the library.

## `tokenizer.use(plugin, options?)`

Delegates directly to the underlying markdown-it instance. Returns `this` for chaining.

```typescript
import Markdoc from '@jvdneut/markdoc';

const tokenizer = new Markdoc.Tokenizer();
tokenizer
  .use(pluginA)
  .use(pluginB, { option: true });

const doc = Markdoc.parse(tokenizer.tokenize(content));
```

## Inline markup plugins

For symmetric delimiters like `::highlight::` or `++inserted++`, write (or import) a markdown-it inline rule that produces open/close token pairs. The Markdoc parser converts any `foo_open` / `foo_close` pair into a node with `type: 'foo'`, which the HTML renderer emits as `<foo>…</foo>` automatically.

**Example: `::text::` → `<mark>text</mark>`**

```typescript
function highlightPlugin(md) {
  md.inline.ruler.push('highlight', (state, silent) => {
    if (state.src[state.pos] !== ':' || state.src[state.pos + 1] !== ':') return false;
    const start = state.pos + 2;
    const end = state.src.indexOf('::', start);
    if (end === -1) return false;
    if (!silent) {
      state.push('mark_open',  'mark', 1);
      const token = state.push('text', '', 0);
      token.content = state.src.slice(start, end);
      state.push('mark_close', 'mark', -1);
    }
    state.pos = end + 2;
    return true;
  });
}

tokenizer.use(highlightPlugin);
```

No Markdoc config change needed — `<mark>` is the default output. Add `config.nodes.mark` only if you need custom rendering or validation.

## Token-to-tag plugins

To convert a token into a Markdoc tag node (e.g. `{% todo completed=false %}`), set `token.meta` using the exported `tagMeta` helper. The parser reads `token.meta.tag` and routes the node through `config.tags` like any hand-authored tag.

```typescript
import { tagMeta } from '@jvdneut/markdoc';

tagMeta('todo', { completed: false })
// → { tag: 'todo', attributes: [{ type: 'attribute', name: 'completed', value: false }] }

tagMeta('todo')
// → { tag: 'todo' }  (for closing tokens)
```

Set this on both the opening and closing tokens of the pair. The closing token only needs `tagMeta('tagName')` with no attributes.

**Example: `* [ ] task` → `{% todo completed=false %}task{% /todo %}`**

```typescript
function taskListPlugin(md) {
  md.core.ruler.push('task_list', (state) => {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      if (token.type !== 'list_item_open') continue;

      // In tight lists the inline token is at i+2 (after paragraph_open);
      // find it defensively:
      let inlineToken = null;
      for (let j = i + 1; j < state.tokens.length; j++) {
        if (state.tokens[j].type === 'list_item_close') break;
        if (state.tokens[j].type === 'inline') { inlineToken = state.tokens[j]; break; }
      }
      if (!inlineToken?.children?.[0]) continue;

      const firstChild = inlineToken.children[0];
      const match = firstChild.content.match(/^\[([ xX])\] /);
      if (!match) continue;

      const completed = match[1].toLowerCase() === 'x';
      token.meta = tagMeta('todo', { completed });
      firstChild.content = firstChild.content.slice(match[0].length);

      for (let j = i + 1; j < state.tokens.length; j++) {
        if (state.tokens[j].type === 'list_item_close') {
          state.tokens[j].meta = tagMeta('todo');
          break;
        }
      }
    }
  });
}

tokenizer.use(taskListPlugin);
```

Then define how `todo` nodes render in your config:

```typescript
const config = {
  tags: {
    todo: {
      attributes: { completed: { type: Boolean } },
      transform(node, config) {
        const { completed } = node.attributes;
        return new Markdoc.Tag('li', { class: completed ? 'done' : 'pending' },
          node.transformChildren(config));
      },
    },
  },
};
```
