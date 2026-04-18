# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Fork

This is a fork of `@markdoc/markdoc` published as `@jvdneut/markdoc`. The `feature/Loops` branch adds a `resolveChildren` schema property that allows loop tags to defer child resolution, enabling per-iteration variable binding for report templating use cases.

## Commands

```bash
npm test              # Run Jasmine unit tests (all *.test.ts files under src/)
npm run marktest      # Run YAML-based integration tests in spec/marktest/tests.yaml
npm run type:check    # TypeScript type checking
npm run lint          # ESLint
npm run build         # Full build (dist/index.js + dist/index.mjs + types)
npm run grammar       # Regenerate src/grammar/tag.js from src/grammar/tag.pegjs (PEG.js)
```

To focus a single test, use `fdescribe`/`fit` in the spec file (Jasmine focused tests).

## Architecture

The pipeline is: **parse → resolve → transform → render**

```
Markdown string
  → Tokenizer (markdown-it + plugins)  src/tokenizer/index.ts
  → Parser                             src/parser.ts
  → AST (Node tree)                    src/ast/node.ts
  → resolve(config)      variables/functions evaluated against config.variables
  → transform(config)    AST → RenderableTreeNode via schema.transform()
  → render               HTML string or React elements
```

All four stages are exposed from `index.ts` as `parse`, `resolve`, `transform`, `renderers.html`, `renderers.react`.

### Key concepts

**Node** (`src/ast/node.ts`) — the AST unit. Has `type` (markdown node type), `tag` (custom tag name), `attributes`, `children`, `slots`. `node.resolve(config)` evaluates all `Variable` and `Function` nodes in attributes; `node.transform(config)` calls the matching schema's `transform()`.

**Schema** (`src/types.ts`, `src/schema.ts`) — defines how a tag or node behaves. Key fields: `render` (output element name), `attributes` (typed attribute definitions), `transform()`, `validate()`, and the fork-added `resolveChildren?: boolean` (set to `false` to skip recursive child resolution — used by loop tags).

**Config** — passed to resolve/transform. Contains `variables`, `functions`, `tags`, `nodes`, `partials`.

**AST value types**: `Variable` (`$path.to.value`), `Function` (`funcName(args)`), and `Node` all implement `resolve(config)` and carry a `$$mdtype` discriminator for serialization.

**Grammar** — the tag syntax (`{% tag attr=value %}`) is parsed by a PEG.js grammar. The generated file `src/grammar/tag.js` must not be edited directly; edit `tag.pegjs` and run `npm run grammar`.

### Built-in tags

Located in `src/tags/`: `if`/`else` (conditional), `partial` (file inclusion), `slot`, `table`. Custom tags go in the `tags` field of config.

### Renderers

- `src/renderers/html.ts` — returns an HTML string; handles void elements and entity escaping
- `src/renderers/react/` — returns React elements; accepts a `components` map for custom tag-to-component mapping

### Fork-specific: `resolveChildren`

When a schema sets `resolveChildren: false`, `Node.resolve()` skips calling `.resolve(config)` on children. This lets a loop tag receive unresolved child nodes and re-resolve them once per iteration with a different `variables` context (e.g., the current loop item merged into config).
