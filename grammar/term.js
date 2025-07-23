/**
 * @file Lean terms
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />

import { sepBy1, sepBy1Indent } from "./util.js"

// @ts-check

const optIdent = $ => optional(seq($.ident, ':'))

export default {
  term: $ => prec.right(repeat1(prec(-10, choice(
    $.literal,
    $.ident,
    /[^\s]/,
  )))),
  ident: $ => seq(
    choice(
      /[[_\pL]--λΠΣ][_!?\pL[₀-₉][ₐ-ₜ][ᵢ-ᵪ]ⱼ']*/,
      seq('«', /[^»]/, '»')
    ),
    optional(seq(token.immediate('.'), token.immediate($.ident)))
  ),
  hole: $ => '_',
  type_spec: $ => seq(':', $.term),
  binder_ident: $ => choice(prec(10, $.ident), $.hole),
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

  match_alts: $ => seq($._match_alts_start, sepBy1($.match_alt, $._match_alt_start), $._dedent),

  let_id_lhs: $ => seq(
    $.binder_ident,
    repeat(choice($.binder_ident, $.bracketed_binder)),
    optional($.type_spec)
  ),
  let_id_decl: $ => seq($.let_id_lhs, ':=', $.term),
  let_pat_decl: $ => seq($.term, optional($.type_spec), ':=', $.term),
  let_eqns_decl: $ => seq($.let_id_lhs, $.match_alts),
  let_decl: $ => choice($.let_id_decl, $.let_pat_decl, $.let_eqns_decl),
  let_rec_decl: $ => seq(
    optional($.documentation),
    optional($.attributes),
    $.let_decl,
    // $.termination_suffix
  ),
  where_decls: $ => seq('where', sepBy1Indent($, $.let_rec_decl, ';')),

  struct_inst_field: $ => seq(
    $.ident,
    optional(seq(
      repeat(seq(choice($.binder_ident, $.bracketed_binder))),
      optional($.type_spec),
      choice(seq(':=', $.term), $.match_alts)
    ))
  ),

  attr_kind: $ => choice('scoped', 'local'),
  attr_instance: $ => seq(optional($.attr_kind), $.term),
  attributes: $ => seq('@[', sepBy1($.attr_instance, ','), ']'),
} 
