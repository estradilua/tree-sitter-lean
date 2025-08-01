/**
 * @file Lean tactics
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />

import { oneOf, sepBy1IndentSemicolon, sepByIndentSemicolon } from "./util.js"

// @ts-check

const tactics = {
  // Tactic.lean
  tactic_nested: $ => $.tactic_seq_bracketed,
  tactic_match: $ => seq('match', optional($.generalizing_param), optional($.motive),
    sepBy1($.match_discr, ','), 'with', $.match_alts),
  tactic_intro_match: $ => seq('intro', $.match_alts),

  // Command.lean
  tactic_open: $ => seq('open', $._open_decl, 'in', $.tactic_seq),
  tactic_set_option: $ => seq('set_option', $.ident, choice('true', 'false', $.str_lit, $.num_lit), 'in', $.tactic_seq),
}

export default {
  ...tactics,
  tactic_p: $ => oneOf($, tactics),

  tactic_seq_indented: $ => sepBy1IndentSemicolon($, $.tactic_p),
  tactic_seq_bracketed: $ => seq('{', sepByIndentSemicolon($.tactic_p), '}'),
  tactic_seq: $ => choice($.tactic_seq_indented, $.tactic_seq_bracketed),
}
