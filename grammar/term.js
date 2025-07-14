/**
 * @file Lean terms
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

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
  binder_ident: $ => choice($.ident, $.hole),
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
} 
