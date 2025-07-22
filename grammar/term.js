/**
 * @file Lean terms
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const newline_ws = /[\s--\n]*\n\s*/

export const sepBy1 = (p, sep) => seq(p, repeat(seq(sep, p)))
export const sepBy1Indent = ($, p, sep) => seq(
  // $._push_col,
  sepBy1(p, choice(seq(newline_ws// , $._guard_col_eq
  ), sep)),
  // $._pop_col
)
export const many1Indent = ($, p) => seq(
  // $._push_col,
  sepBy1(p, seq(newline_ws// , $._guard_col_ge
  )),
  // $._pop_col
)

const optIdent = $ => optional(seq($.ident, ':'))

export default {
  term: $ => repeat1(choice(
    $.literal,
    $.ident,
    /[^\s]/,
  )),
  ident: $ => seq(
    choice(
      /[[_\pL]--λΠΣ][_!?\pL[₀-₉][ₐ-ₜ][ᵢ-ᵪ]ⱼ]*/,
      seq('«', /[^»]/, '»')
    ),
    optional(seq('.', $.ident))
  ),
  hole: $ => '_',
  type_spec: $ => seq(':', $.term),
  binder_ident: $ => choice(prec(10,$.ident), $.hole),
  explicit_binder: $ => seq('(', repeat1($.binder_ident), optional($.type_spec), ')'),
  strict_implicit_binder: $ => seq(
    choice('{{', '⦃'),
    repeat1($.binder_ident),
    optional($.type_spec),
    choice('}}', '⦄'),
  ),
  implicit_binder: $ => seq('{', repeat1($.binder_ident), optional($.type_spec), '}'),
  inst_binder: $ => seq('[', optIdent($), $.term, ']'),
  bracketed_binder: $ => choice(
    $.explicit_binder,
    $.strict_implicit_binder,
    $.implicit_binder,
    $.inst_binder
  ),

  match_alt: $ => seq('|', sepBy1(sepBy1($.term, ','), '|'), '=>', $.term),

  match_alts: $ => seq($._push_col, sepBy1($.match_alt, $._match_alt_start)),

  let_id_lhs: $ => seq(
    $.binder_ident,
    repeat(choice($.binder_ident, $.bracketed_binder)),
    optional($.type_spec)
  ),
  let_id_decl: $ => seq($.let_id_lhs, ':=', $.term),
  let_pat_decl: $ => seq($.term, optional($.type_spec), ':=', $.term),
  let_eqns_decl: $ => seq($.let_id_lhs, ),
  let_decl: $ => choice($.let_id_decl, $.let_pat_decl, $.let_eqns_decl),
  let_rec_decl: $ => seq(
    optional($.documentation),
    optional($.attributes),
    $.let_decl,
    // $.termination_suffix
  ),
  where_decls: $ => 'IMPOSSIBLE', // seq('where', sepBy1Indent($, $.let_rec_decl, ';')),

  struct_inst_field: $ => seq(
    $.ident,
    optional(seq(
      repeat(seq(choice($.binder_ident, $.bracketed_binder))),
      optional($.type_spec),
      choice(seq(':=', $.term), $.match_alts)
    ))
  )
} 
