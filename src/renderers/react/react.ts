import Tag from '../../tag';
import type { RenderableTreeNodes, Scalar } from '../../types';

import type { createElement, ComponentType, Fragment, ReactNode } from 'react';

type ReactShape = Readonly<{
  createElement: typeof createElement;
  Fragment: typeof Fragment;
}>;

type Component = ComponentType<any>;
type Key = string | number;

function tagName(
  name: string,
  components: Record<string, Component> | ((string: string) => Component)
): string | Component {
  return typeof name !== 'string'
    ? name // This can be an object, e.g. when React.forwardRef is used
    : name[0] !== name[0].toUpperCase()
    ? name
    : components instanceof Function
    ? components(name)
    : components[name];
}

export type RenderOpts = {
  components?: Record<string, Component> | ((string: string) => Component);
  resolveTagName?: typeof tagName;
};
export default function dynamic(
  node: RenderableTreeNodes,
  React: ReactShape,
  { components = {}, resolveTagName = tagName }: RenderOpts = {}
) {
  function deepRender(value: any): any {
    if (value == null || typeof value !== 'object') return value;

    // An array *attribute value* (e.g. a slot rendered into a custom
    // component's prop) becomes a plain array of React nodes here, which the
    // consumer typically renders directly (`{prop}`) rather than through
    // this renderer's own Fragment-wrapping array branch below — so, unlike
    // that branch, each Tag item needs its own key or React warns ("Each
    // child in a list should have a unique key prop") the first time the
    // array holds more than one Tag.
    if (Array.isArray(value))
      return value.map((item, index) =>
        Tag.isTag(item) ? render(item, index) : deepRender(item)
      );

    if (value.$$mdtype === 'Tag') return render(value);

    if (typeof value !== 'object') return value;

    const output: Record<string, Scalar> = {};
    for (const [k, v] of Object.entries(value)) output[k] = deepRender(v);
    return output;
  }

  function render(node: RenderableTreeNodes, key?: Key): ReactNode {
    if (Array.isArray(node))
      return React.createElement(
        React.Fragment,
        null,
        ...node.map((child) => render(child))
      );

    if (node === null || typeof node !== 'object' || !Tag.isTag(node))
      return node;

    const {
      name,
      attributes: { class: className, ...attrs } = {},
      children = [],
    } = node;

    if (className) attrs.className = className;

    const props =
      Object.keys(attrs).length == 0 ? undefined : deepRender(attrs);

    return React.createElement(
      resolveTagName(name, components),
      key == null ? props ?? null : { ...props, key },
      ...children.map((child) => render(child))
    );
  }

  return render(node);
}
