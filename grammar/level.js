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
  level_max: $ => prec.right(seq('max', repeat1($._level))),
  level_imax: $ => prec.right(seq('imax', repeat1($._level))),
  level_hole: $ => '_',
  level_num: $ => $.num_lit,
  level_ident: $ => $.ident,
  level_add_lit: $ => prec(-10, seq($._level, '+', $.num_lit)),
}

export default {
  ...levels,
  _level: $ => oneOf($, levels),
}
