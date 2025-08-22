/**
 * @file Lean terms
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { oneOf, sepBy, sepBy1, sepBy1IndentSemicolon, sepByIndent } from "./util.js"

export const optIdent = $ => optional(seq($.ident, ':'))
export const optType = ($, requireType = false) => requireType ? $.type_spec : optional($.type_spec)

const terms = {
  term_by: $ => seq('by', $.tactic_seq),
  term_do: $ => seq('do', $.do_seq),
  term_ident: $ => seq($.ident, optional($._ident_univ)),
  term_num: $ => $.num_lit,
  term_str: $ => $.str_lit,
  term_raw_str: $ => $.raw_str_lit,
  term_char: $ => $.char_lit,
  term_type: $ => prec.right(seq(choice('Type', 'Sort'), optional($._level))),
  term_type_star: $ => 'Type*',
  term_prop: $ => 'Prop',
  term_hole: $ => '_',
  term_synthetic_hole: $ => seq('?', $._binder_ident),
  term_sorry: $ => 'sorry',
  term_cdot: $ => $.cdot,
  term_type_ascription: $ => seq('(', $._o, seq($.term, ':', optional($.term)), ')', $._c),
  term_tuple: $ => seq('(', $._o, optional(seq($.term, ',', sepBy1($.term, ',', true))), ')', $._c),
  term_paren: $ => seq('(', $._o, $.term, ')', $._c),
  term_anonymous_ctor: $ => seq('⟨', $._o, sepBy($.term, ',', true), '⟩', $._c),
  term_suffices: $ => prec.left(seq('suffices', $.suffices_decl, ';', $.term)),
  term_show: $ => seq('show', $.term, $.show_rhs),
  term_explicit: $ => prec(10, seq('@', $.term)),
  term_inaccessible: $ => seq('.(', $.term, ')'),
  term_forall: $ => seq($.forall, repeat1($.let_id_binder), optType($), ',', $.term),
  term_match: $ => seq('match', optional($.generalizing_param), optional($.motive), sepBy1($.match_discr, ','), 'with', $.match_alts),
  term_nomatch: $ => prec.right(seq('nomatch', sepBy1($.term, ','))),
  term_nofun: $ => 'nofun',
  // TODO: this is delicate. PUSH_COL messes stuff up.
  term_struct_inst: $ => seq(
    '{',
    $._push_col,
    optional(seq(sepBy1($.term, ','), 'with', $._pop_col, $._push_col)),
    optional(seq(
      sepBy1($.struct_inst_field, choice($._eq_col_start, ',')),
      optional(','),
    )),
    optional($.ellipsis),
    optType($),
    '}',
    $._pop_col
  ),
  term_fun: $ => seq($.lambda, choice($.basic_fun, $.match_alts)),
  term_arrow: $ => seq($.right_arrow, $.term),
  term_dep_arrow: $ => seq($.bracketed_binder, $.right_arrow, $.term),
  term_explicit: $ => prec(10, seq('@', $._term_1)),

  term_type_ascription: $ => seq('(', $._o, $.term, ':', optional($.term), ')', $._c),
  term_tuple: $ => seq('(', $._o, optional(seq($.term, ',', $._terms_comma)), ')', $._c),

  term_anonymous_ctor: $ => seq('⟨', $._o, optional($._terms_comma), '⟩', $._c),
  term_list: $ => seq('[', $._o, optional($._terms_comma), ']', $._c),

  term_other: $ => token(prec(-1, /[^\s]/)),
}

export default {
  ...terms,
  term: $ => prec.right(repeat1($._term_1)),

  _term_1: $ => oneOf($, terms),
  _terms_comma: $ => sepBy1($.term, ',', true),

  // see identFnAux on Basic.lean
  ident: $ => /(?:(?:[[\pL]--λΠΣ]|_[[[0-9_'!?\pL]--λΠΣ][₀-₉][ₐ-ₜ][ᵢ-ᵪ]ⱼ])[[[0-9_'!?\pL]--λΠΣ][₀-₉][ₐ-ₜ][ᵢ-ᵪ]ⱼ]*|«[^»]+»)(?:\.(?:[[_\pL]--λΠΣ][[[0-9_'!?\pL]--λΠΣ][₀-₉][ₐ-ₜ][ᵢ-ᵪ]ⱼ]*|«[^»]+»|[0-9]+))*/,

  _ident_univ: $ => seq(token.immediate('.{'), sepBy1($._level, ','), '}'),

  decl_ident: $ => prec(10, seq(
    $.ident,
    optional(seq(
      '.{',
      sepBy1(/[^,}\s]/, ','),
      '}'
    ))
  )),

  // symbols
  left_arrow: $ => choice('←', '<-'),
  right_arrow: $ => choice('→', '->'),
  forall: $ => choice('∀', 'forall'),
  defeq: $ => ':=',
  darrow: $ => '=>',
  fun_arrow: $ => choice('↦', '=>'),
  true_val: $ => 'true',
  false_val: $ => 'false',
  ellipsis: $ => '..',
  lambda: $ => seq(choice('λ', 'fun'), token.immediate(/\s/)),
  cdot: $ => choice('·', '.'),

  type_spec: $ => seq(':', $.term),

  // binders
  _binder_ident: $ => choice($.ident, $.term_hole),
  explicit_binder: $ => seq('(', $._o, repeat1($._binder_ident), optType($), ')', $._c),
  strict_implicit_binder: $ => seq(
    choice('{{', '⦃'),
    repeat1($._binder_ident),
    optType($),
    choice('}}', '⦄'),
  ),
  implicit_binder: $ => seq('{', $._o, repeat1($._binder_ident), optType($), '}', $._c),
  inst_binder: $ => seq('[', optIdent($), $.term, ']'),
  bracketed_binder: $ => choice(
    $.explicit_binder,
    $.strict_implicit_binder,
    $.implicit_binder,
    $.inst_binder
  ),
  binder: $ => choice($._binder_ident, $.bracketed_binder),

  // match_alt
  match_alt: $ => seq('|', sepBy1(sepBy1($.term, ','), '|'), $.darrow, $.term),
  match_alts: $ => seq($._match_alts_start, sepBy1($.match_alt, $._match_alt_start), $._dedent),

  // match_expr
  match_expr_pat: $ => seq(optional(seq($.ident, '@')), $.ident, repeat($._binder_ident)),

  // let
  let_id_lhs: $ => seq(
    $._binder_ident,
    repeat($.binder),
    optType($)
  ),
  let_id_decl: $ => seq($.let_id_lhs, $.defeq, $.term),
  let_pat_decl: $ => prec.right(seq($.term, optType($), $.defeq, $.term)),
  let_eqns_decl: $ => seq($.let_id_lhs, $.match_alts),
  let_decl: $ => choice($.let_id_decl, $.let_pat_decl, $.let_eqns_decl),
  let_rec_decl: $ => seq(
    optional($.documentation),
    optional($.attributes),
    $.let_decl,
    // $.termination_suffix
  ),
  let_rec_decls: $ => prec.right(sepBy1($.let_rec_decl, ',')),

  // where
  where_decls: $ => seq('where', sepBy1IndentSemicolon($, $.let_rec_decl)),

  struct_inst_field: $ => seq(
    $.ident,
    optional(seq(
      repeat($.binder),
      optType($),
      choice(seq($.defeq, $.term), $.match_alts)
    ))
  ),

  // have
  have_id_decl: $ => seq(have_id_lhs($), $.defeq, $.term),
  have_eqns_decl: $ => seq(have_id_lhs($), $.match_alts),
  have_decl: $ => choice($.have_id_decl, $.let_pat_decl, $.have_eqns_decl),

  // match
  generalizing_param: $ => seq('(', $._o, 'generalizing', $.defeq, choice($.true_val, $.false_val), ')', $._c),
  motive: $ => seq('(', $._o, 'motive', $.defeq, $.term, ')', $._c),
  match_discr: $ => seq(optional(seq($._binder_ident, ':')), $.term),

  // suffices
  from_term: $ => seq('from', $.term),
  show_rhs: $ => choice($.from_term, $.term_by),
  suffices_decl: $ => seq(optional(seq($._binder_ident, ':')), $.term, $.show_rhs),

  // fun
  fun_binder: $ => choice($.strict_implicit_binder, $.implicit_binder, $.inst_binder, $.term),
  basic_fun: $ => seq(repeat1($.fun_binder), optType($), $.fun_arrow, $.term),

  // argument
  named_argument: $ => seq('(', $._o, $.ident, $.defeq, $.term, ')', $._c),
}

const have_id_lhs = $ => seq(optional(seq($._binder_ident, repeat($.binder))), optType($))
