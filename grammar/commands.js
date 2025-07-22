/**
 * @file Lean commands
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { sepBy1 } from "./term.js";

const declSig = $ => seq(
  repeat(choice($.binder_ident, $.bracketed_binder)),
  $.type_spec
)

const optDeclSig = $ => seq(
  repeat(choice($.binder_ident, $.bracketed_binder)),
  optional($.type_spec)
)

const declModifiers = $ => seq(
  optional($.documentation),
  optional($.attributes),
  optional($.visibility),
  optional($.noncomputable),
  optional('unsafe'),
  optional(choice('partial', 'norec'))
)

export default {

  documentation: $ => seq('/--', repeat(/[^\s]+/) , '-/'),
  visibility: _ => choice(/private\s/, /protected\s/),
  noncomputable: _ => /noncomputable\s/,

  declaration: $ => seq(
    declModifiers($),
    choice($.abbrev, $.definition, $.theorem, $.opaque, $.instance, $.axiom, $.example,
      $.inductive, $.class_inductive, $.structure),
  ),

  decl_ident: $ => seq(
    $.ident,
    optional(seq(
      '.{',
      /[^,}\s]/,
      repeat(seq(',', /[^,}\s]/)),
      '}'
    ))
  ),

  decl_val_simple: $ => seq(':=', $.term, /* $.termination_hints */ optional($.where_decls)),
  decl_val_eqns: $ => seq($.match_alts, /* $.termination_hints */ optional($.where_decls)),
  where_struct_inst: $ => seq(
    'where',
    optional(seq($._push_col, sepBy1($.struct_inst_field, choice($._eq_col_start, ';')))),
    optional($.where_decls)
  ),

  decl_val: $ => choice($.decl_val_simple, $.decl_val_eqns, $.where_struct_inst),

  abbrev: $ => seq(
    'abbrev',
    $.decl_ident,
    optDeclSig($),
    $.decl_val
  ),

  deriving: $ => seq('deriving' /* notFollowedBy 'instance' */, sepBy1($.ident, ',')),
  definition: $ => seq('def', $.decl_ident, optDeclSig($), $.decl_val, optional($.deriving)),

  theorem: $ => seq(choice('theorem', 'lemma'), $.decl_ident, declSig($), $.decl_val),

  opaque: $ => seq('opaque', $.decl_ident, declSig($), $.decl_val_simple),

  named_prio: $ => seq('(', 'priority', ':=', $.num_lit, ')'),
  instance: $ => seq(
    optional($.attr_kind),
    'instance',
    optional($.named_prio),
    optional($.decl_ident),
    declSig($),
    $.decl_val
  ),

  axiom: $ => seq('axiom', $.decl_ident, declSig($)),

  example: $ => seq('example', optDeclSig($), $.decl_val),

  ctor: $ => seq(optional($.documentation), '|', declModifiers($), $.ident, optDeclSig($)),
  computed_field: $ => seq(declModifiers($), $.ident, ':', $.term, $.match_alts),
  computed_fields: $ => prec.right(seq('with', optional(seq($._push_col, sepBy1($.computed_fields,
    $._eq_col_start))))),

  inductive: $ => prec.right(seq('inductive', $.decl_ident, optDeclSig($),
    optional(choice(':=', 'where')), repeat($.ctor), optional($.computed_fields),
    optional($.deriving))),

  class_inductive: $ => prec.right(seq('class', 'inductive', $.decl_ident, optDeclSig($),
    optional(choice(':=', 'where')), repeat($.ctor), optional($.deriving))),

  struct_explicit_binder: $ => seq(declModifiers($), '(', repeat1($.ident), optDeclSig($),
    optional(seq(':=', $.term)), ')'),
  struct_implicit_binder: $ => seq(declModifiers($), '{', repeat1($.ident), declSig($), '}'),
  struct_inst_binder: $ => seq(declModifiers($), '[', repeat1($.ident), declSig($), ']'),
  struct_simple_binder: $ => seq(declModifiers($), $.ident, optDeclSig($),
    optional(seq(':=', $.term))),
  struct_fields: $ => seq($._push_col, sepBy1(choice($.struct_explicit_binder,
    $.struct_implicit_binder, $.struct_inst_binder, $.struct_simple_binder), $._eq_col_start)),
  struct_ctor: $ => seq(declModifiers($), $.ident, '::'),
  struct_parent: $ => seq(optional(seq($.ident, ':')), $.term),
  extends: $ => seq('extends', sepBy1($.struct_parent, ','), optional($.type_spec)),
  
  structure: $ => prec.right(seq(choice('structure', 'class'), $.decl_ident,
    repeat($.bracketed_binder), optional($.type_spec), optional($.extends),
    optional(choice(':=', 'where')), optional($.struct_ctor), optional($.struct_fields),
    optional($.deriving))),
}
