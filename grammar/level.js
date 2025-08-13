/**
 * @file Lean levels
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />

import { oneOf } from "./util.js"

// @ts-check

const levels = {
  level_paren: $ => seq('(', $._level, ')'),
  level_max: $ => 'max',
  level_imax: $ => 'imax',
  level_hole: $ => '_',
  level_num: $ => $.num_lit,
  level_ident: $ => $.ident,
  level_add: $ => '+',
}

export default {
  ...levels,
  _level: $ => repeat1(oneOf($, levels)),
}
