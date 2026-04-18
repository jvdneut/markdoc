# Template inheritance

Template inheritance lets a markdown file extend a base template and override named regions (blocks) within it, similar to Django's `{% extends %}` / `{% block %}` system.

## How it works

1. A **base template** defines the overall structure using `{% block name="..." %}` tags. Each block has a name and optional default content.
2. A **child document** declares `extends: <filename>` in its YAML frontmatter and overrides specific blocks.
3. Call `resolveInheritance(childNode, config)` between `parse` and `transform`. It returns the base template's AST with child block content substituted in. Child content outside of blocks is silently ignored.

## Quick example

**`base.md`**
```markdown
# Report

{% block name="title" %}
Untitled Report
{% /block %}

{% block name="body" %}
No content provided.
{% /block %}
```

**`report.md`**
```markdown
---
extends: base.md
---

{% block name="title" %}
Student Progress Report
{% /block %}

{% block name="body" %}
Hello, {% $student.firstName %}! Your score is {% $student.score %}.
{% /block %}
```

**Rendering**
```typescript
import Markdoc from '@jvdneut/markdoc';
import fs from 'fs';

const base = Markdoc.parse(fs.readFileSync('base.md', 'utf8'));
const child = Markdoc.parse(fs.readFileSync('report.md', 'utf8'));

const config = {
  templates: { 'base.md': base },
  variables: { student: { firstName: 'Alice', score: 95 } },
};

const merged  = Markdoc.resolveInheritance(child, config);
const tree    = Markdoc.transform(merged, config);
const html    = Markdoc.renderers.html(tree);
```

## Multi-level inheritance

Base templates can themselves extend other templates. `resolveInheritance` follows the chain and the most-derived (child) block always wins.

```
grandparent.md  ←  base.md  ←  report.md
```

If `report.md` and `base.md` both override a block defined in `grandparent.md`, `report.md`'s version is used.

## Config

Base templates are provided via `config.templates` (a `Record<string, Node>` of pre-parsed AST nodes), separate from `config.partials`.

```typescript
const config = {
  templates: {
    'base.md':        Markdoc.parse(baseContent),
    'grandparent.md': Markdoc.parse(grandparentContent),
  },
};
```

## Block tag syntax

Blocks use an explicit `name` attribute:

```
{% block name="blockName" %}
default content
{% /block %}
```

Blocks without a matching override in the child retain their default content.

## Validation

`resolveInheritance` returns a plain `Node` tree, so `Markdoc.validate` works on it as normal:

```typescript
const merged = Markdoc.resolveInheritance(child, config);
const errors = Markdoc.validate(merged, config);
```

If `config.templates` is missing a referenced template, the returned node will carry a `template-not-found` error with level `critical`.
