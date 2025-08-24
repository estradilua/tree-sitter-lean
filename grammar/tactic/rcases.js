/**
 * @file RCases tactics
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { optType } from "../term.js"
import { oneOf, sepBy, sepBy1 } from "../util.js"

export const tactic_rcases = {
  tactic_rcases: $ => seq('rcases', sepBy($.elim_target, ','), optional(seq('with', $._rcases_pat_lo))),
  tactic_obtain: $ => seq('obtain', optional($._rcases_pat_med),
    choice(seq(optType($), seq($.defeq, sepBy1($.term, ','))), $.type_spec)),
  tactic_rintro: $ => seq('rintro', repeat1($.rintro_pat), optType($)),
}

const rcases_pats = {
  rcases_pat_one: $ => $.ident,
  rcases_pat_ignore: $ => '_',
  rcases_pat_clear: $ => '-',
  rcases_pat_tuple: $ => seq('⟨', sepBy($._rcases_pat_lo, ','), '⟩'),
  rcases_pat_explicit_tuple: $ => seq('@⟨', sepBy($._rcases_pat_lo, ','), '⟩'),
  rcases_pat_paren: $ => seq('(', $._rcases_pat_lo, ')'),
}

export default {
  ...rcases_pats,
  rcases_pat: $ => oneOf($, rcases_pats),
  _rcases_pat_med: $ => sepBy1($.rcases_pat, '|'),
  _rcases_pat_lo: $ => seq($._rcases_pat_med, optType($)),

  rintro_pat: $ => oneOf($, rcases_pats, ['rcases_pat_paren'], ['rintro_pat_one']),
  rintro_pat_one: $ => seq('(', repeat1($.rintro_pat), optType($), ')'),
}
