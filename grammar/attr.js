/**
 * @file Lean attributes
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { oneOf, sepBy1 } from "./util.js"

export const attrKind = $ => optional(alias(choice('scoped', 'local'), $.attr_kind))

const attrs = {
}

export default {
  ...attrs,
  attr_p: $ => oneOf($, attrs),
  attr_instance: $ => seq(attrKind($), $.attr_p),
  attributes: $ => seq('@[', sepBy1($.attr_instance, ','), ']'),
}
