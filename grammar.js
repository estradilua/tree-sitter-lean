/**
 * @file Lean grammar for tree-sitter
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import decl from './grammar/decl.js';
import lits from './grammar/literals.js';
import term from './grammar/term.js';

export default grammar({
  name: "lean",

  externals: $ => [
    $._raw_str_start,
    $.raw_str_content,
    $._raw_str_end,
    $._push_col,
    $._match_alts_start,
    $._match_alt_start,
    $._eq_col_start,
    $.__error_sentinel,
  ],

  rules: {
    lean: $ => repeat(
      $.declaration
    ),

    ...decl,
    ...lits,
    ...term,
  },
});
