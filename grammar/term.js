/**
 * @file Lean terms
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { sepBy1, sepBy1Indent } from "./util.js"

export const optIdent = $ => optional(seq($.ident, ':'))
export const optType = $ => optional($.type_spec)
export const attrKind = $ => optional(alias(choice('scoped', 'local'), $.attr_kind))

export default {
  term: $ => prec.right(repeat1(prec(-10, choice(
    seq('{', optional($.term), '}'),
    seq('(', optional($.term), ')'),
    seq('[', optional($.term), ']'),
    seq('⟨', optional($.term), '⟩'),
    $.literal,
    $.ident,
    /[^\s]/,
  )))),

  // see identFnAux on Basic.lean
  ident: $ => seq(
    choice(/[[_\pL]--λΠΣ][[[0-9_'!?\pL]--λΠΣ][₀-₉][ₐ-ₜ][ᵢ-ᵪ]ⱼ]*/, /«[^»]+»/),
    repeat(seq(
      token.immediate('.'),
      token.immediate(choice(/[[_\pL]--λΠΣ][[[0-9_'!?\pL]--λΠΣ][₀-₉][ₐ-ₜ][ᵢ-ᵪ]ⱼ]*/, /«[^»]+»/, /[0-9]+/))
    ))
  ),

  // symbols
  left_arrow: $ => choice('←', '<-'),
  hole: $ => '_',
  defeq: $ => ':=',
  darrow: $ => '=>',

  type_spec: $ => seq(':', $.term),

  // binders
  binder_ident: $ => choice(prec(-20, $.ident), $.hole),
  explicit_binder: $ => seq('(', repeat1($.binder_ident), optType($), ')'),
  strict_implicit_binder: $ => seq(
    choice('{{', '⦃'),
    repeat1($.binder_ident),
    optType($),
    choice('}}', '⦄'),
  ),
  implicit_binder: $ => seq('{', repeat1($.binder_ident), optType($), '}'),
  inst_binder: $ => seq('[', optIdent($), $.term, ']'),
  bracketed_binder: $ => choice(
    $.explicit_binder,
    $.strict_implicit_binder,
    $.implicit_binder,
    $.inst_binder
  ),

  // match_alt
  match_alt: $ => seq('|', sepBy1(sepBy1($.term, ','), '|'), $.darrow, $.term),
  match_alts: $ => seq($._match_alts_start, sepBy1($.match_alt, $._match_alt_start), $._dedent),

  // match_expr
  match_expr_pat: $ => seq(optional(seq($.ident, '@')), $.ident, repeat($.binder_ident)),

  // let
  let_id_binder: $ => choice($.binder_ident, $.bracketed_binder),
  let_id_lhs: $ => seq(
    $.binder_ident,
    repeat($.let_id_binder),
    optType($)
  ),
  let_id_decl: $ => seq($.let_id_lhs, $.defeq, $.term),
  let_id_decl_no_binders: $ => seq($.ident, optType($), $.defeq, $.term),
  let_pat_decl: $ => prec.right(seq($.term, optType($), $.defeq, $.term)),
  let_eqns_decl: $ => seq($.let_id_lhs, $.match_alts),
  let_decl: $ => choice($.let_id_decl, $.let_pat_decl, $.let_eqns_decl),
  let_rec_decl: $ => seq(
    optional($.documentation),
    optional($.attributes),
    $.let_decl,
    // $.termination_suffix
  ),
  let_rec_decls: $ => sepBy1($.let_rec_decl, ','),

  // where
  where_decls: $ => seq('where', sepBy1Indent($, $.let_rec_decl, ';')),

  struct_inst_field: $ => seq(
    $.ident,
    optional(seq(
      repeat(seq(choice($.binder_ident, $.bracketed_binder))),
      optType($),
      choice(seq($.defeq, $.term), $.match_alts)
    ))
  ),

  // attribute
  attr_instance: $ => seq(attrKind($), $.term),
  attributes: $ => seq('@[', sepBy1($.attr_instance, ','), ']'),

  // have
  have_id_decl: $ => seq(have_id_lhs($), $.defeq, $.term),
  have_eqns_decl: $ => seq(have_id_lhs($), $.match_alts),
  have_decl: $ => choice($.have_id_decl, $.let_pat_decl, $.have_eqns_decl),

  // match
  generalizing_param: $ => seq('(', 'generalizing', $.defeq, choice($.true_val, $.false_val), ')'),
  motive: $ => seq('(', 'motive', $.defeq, $.term, ')'),
  match_discr: $ => seq(optional(seq($.binder_ident, ':')), $.term),
}

const have_id_lhs = $ => seq(optional(seq($.binder_ident, repeat($.let_id_binder))), optType($))
