import { parse, transform, resolveInheritance, renderers } from '../index';

function html(content: string, config = {}) {
  const doc = parse(content);
  const merged = resolveInheritance(doc, config);
  return renderers.html(transform(merged, config));
}

const BASE = `
{% block name="title" %}
Default Title
{% /block %}

{% block name="body" %}
Default body
{% /block %}
`.trim();

const GRANDPARENT = `
{% block name="header" %}
GP Header
{% /block %}

{% block name="content" %}
GP Content
{% /block %}
`.trim();

const MIDDLE = `---
extends: grandparent.md
---
{% block name="content" %}
Middle Content
{% /block %}
`.trim();

describe('resolveInheritance', () => {
  describe('single-level inheritance', () => {
    it('renders base with default blocks when child defines none', () => {
      const child = parse('---\nextends: base.md\n---');
      const config = { templates: { 'base.md': parse(BASE) } };
      const result = renderers.html(transform(resolveInheritance(child, config), config));
      expect(result).toContain('Default Title');
      expect(result).toContain('Default body');
    });

    it('replaces an overridden block', () => {
      const child = parse('---\nextends: base.md\n---\n{% block name="title" %}My Title{% /block %}');
      const config = { templates: { 'base.md': parse(BASE) } };
      const result = renderers.html(transform(resolveInheritance(child, config), config));
      expect(result).toContain('My Title');
      expect(result).not.toContain('Default Title');
    });

    it('keeps default content for blocks not overridden', () => {
      const child = parse('---\nextends: base.md\n---\n{% block name="title" %}Override{% /block %}');
      const config = { templates: { 'base.md': parse(BASE) } };
      const result = renderers.html(transform(resolveInheritance(child, config), config));
      expect(result).toContain('Default body');
    });

    it('ignores child content outside of blocks', () => {
      const child = parse('---\nextends: base.md\n---\nThis should be ignored\n{% block name="title" %}T{% /block %}');
      const config = { templates: { 'base.md': parse(BASE) } };
      const result = renderers.html(transform(resolveInheritance(child, config), config));
      expect(result).not.toContain('This should be ignored');
    });
  });

  describe('multi-level inheritance', () => {
    it('child block overrides grandparent, middle block preserved', () => {
      const child = parse('---\nextends: middle.md\n---\n{% block name="header" %}Child Header{% /block %}');
      const config = {
        templates: {
          'middle.md': parse(MIDDLE),
          'grandparent.md': parse(GRANDPARENT),
        },
      };
      const result = renderers.html(transform(resolveInheritance(child, config), config));
      expect(result).toContain('Child Header');
      expect(result).toContain('Middle Content');
      expect(result).not.toContain('GP Header');
      expect(result).not.toContain('GP Content');
    });
  });

  describe('no inheritance', () => {
    it('returns a node with equivalent content when no extends is present', () => {
      const doc = parse('# Hello');
      const result = resolveInheritance(doc, {});
      expect(renderers.html(transform(result, {}))).toEqual(renderers.html(transform(doc, {})));
    });
  });

  describe('error handling', () => {
    it('attaches template-not-found error when template is missing', () => {
      const child = parse('---\nextends: missing.md\n---');
      const result = resolveInheritance(child, {});
      expect(result.errors.some((e) => e.id === 'template-not-found')).toBe(true);
    });
  });
});
