/**
 * @file Lean tactics
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { oneOf, sepBy1, sepBy1IndentSemicolon, sepByIndentSemicolon } from "./util.js"
import rca, { tactic_rcases } from "./tactic/rcases.js"

const tactics = {
  // Tactic.lean
  tactic_nested: $ => $.tactic_seq_bracketed,
  tactic_match: $ => seq('match', optional($.generalizing_param), optional($.motive),
    sepBy1($.match_discr, ','), 'with', $.match_alts),
  tactic_intro_match: $ => seq('intro', $.match_alts),
  tactic_intro: $ => seq('intro', optional($.term)),

  // Command.lean
  tactic_open: $ => seq('open', $._open_decl, 'in', $.tactic_seq),
  tactic_set_option: $ => seq('set_option', $.ident, choice('true', 'false', $.str_lit, $.num_lit), 'in', $.tactic_seq),

  tactic_cdot: $ => seq($.cdot, $.tactic_seq),

  tactic_other: $ => seq($.ident, optional($.term)),

  ...tactic_rcases,
}

export default {
  ...tactics,
  tactic_p: $ => oneOf($, tactics),

  tactic_seq_indented: $ => sepBy1IndentSemicolon($, $.tactic_p),
  tactic_seq_bracketed: $ => seq('{', optional($.tactic_seq_indented), '}'),
  tactic_seq: $ => choice($.tactic_seq_indented, $.tactic_seq_bracketed),

  elim_target: $ => seq(optional(seq($._binder_ident, ':')), $.term),

  ...rca,
}
