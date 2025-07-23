/**
 * @file Lean commands
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { oneOf, sepBy1 } from "./util.js";

const declSig = $ => seq(repeat(choice($.binder_ident, $.bracketed_binder)), $.type_spec)
const optDeclSig = $ => seq(repeat(choice($.binder_ident, $.bracketed_binder)), optional($.type_spec))

const declModifiers = $ => seq(
  optional($.documentation),
  optional($.attributes),
  optional($.visibility),
  optional($.noncomputable),
  optional('unsafe'),
  optional(choice('partial', 'norec'))
)

const commands = {
  module_doc: $ => seq('/-!', repeat(/[^\s]+/), '-/'),
  declaration: $ => seq(declModifiers($), oneOf($, declarations)),
  deriving: $ => seq('deriving', 'instance', sepBy1($.ident, ','), 'for', sepBy1($.ident, ',')),
  noncomputable_section: $ => seq('noncomputable', 'section', optional($.ident)),
  section: $ => seq('section', optional($.ident)),
  namespace: $ => seq('namespace', $.ident),
  end: $ => seq('end', optional($.ident)),
  variable: $ => seq('variable', repeat1($.bracketed_binder)),
  universe: $ => seq('universe', repeat1($.ident)),
  check: $ => seq('#check', $.term),
  check_failure: $ => seq('#check_failure', $.term),
  eval: $ => seq('#eval', $.term),
  eval_bang: $ => seq('#eval!', $.term),
  synth: $ => seq('#synth', $.term),
  exit: $ => '#exit',
  print: $ => seq('#print', choice($.ident, $.str_lit)),
  print_axioms: $ => seq('#print', 'axioms', $.ident),
  print_eqns: $ => seq('#print', choice('equations', 'eqns'), $.ident),
  print_tac_tags: $ => seq('#print', 'tactic', 'tags'),
  where: $ => '#where',
  version: $ => '#version',
  init_quot: $ => 'init_quot',
  set_option: $ => seq('set_option', $.ident, choice('true', 'false', $.str_lit, $.num_lit)),
  attribute: $ => seq('attribute', '[', sepBy1(choice(seq('-', $.ident), $.attr_instance), ','), ']', repeat1($.ident)),
  export: $ => seq('export', $.ident, '(', repeat1($.ident), ')'),
  open: $ => seq('open', oneOf($, open_decls)),
}

const declarations = {
  abbrev: $ => seq('abbrev', $.decl_ident, optDeclSig($), $.decl_val),
  definition: $ => prec.right(seq('def', $.decl_ident, optDeclSig($), $.decl_val, optional($.deriving))),
  theorem: $ => seq(choice('theorem', 'lemma'), $.decl_ident, declSig($), $.decl_val),
  opaque: $ => seq('opaque', $.decl_ident, declSig($), $.decl_val_simple),
  instance: $ => seq(optional($.attr_kind), 'instance', optional($.named_prio),
    optional($.decl_ident), declSig($), $.decl_val),
  axiom: $ => seq('axiom', $.decl_ident, declSig($)),
  example: $ => seq('example', optDeclSig($), $.decl_val),
  inductive: $ => prec.right(seq('inductive', $.decl_ident, optDeclSig($),
    optional('where'), repeat($.ctor), optional($.computed_fields),
    optional($.deriving))),
  class_inductive: $ => prec.right(seq('class', 'inductive', $.decl_ident, optDeclSig($),
    optional('where'), repeat($.ctor), optional($.deriving))),
  structure: $ => prec.right(seq(choice('structure', 'class'), $.decl_ident,
    repeat($.bracketed_binder), optional($.type_spec), optional($.extends),
    optional(seq('where', optional($.struct_ctor), optional($.struct_fields))),
    optional($.deriving))),
}

const open_decls = {
  open_hiding: $ => seq($.ident, 'hiding', repeat1($.ident)),
  open_renaming: $ => seq($.ident, 'renaming', sepBy1(seq($.ident, choice('→', '->'), $.ident), ',')),
  open_only: $ => seq($.ident, '(', repeat1($.ident), ')'),
  open_simple: $ => repeat1($.ident),
  open_scoped: $ => seq('scoped', repeat1($.ident)),
}

export default {
  ...commands,
  ...declarations,
  ...open_decls,
  command: $ => oneOf($, commands),

  documentation: $ => seq('/--', repeat(/[^\s]+/), '-/'),
  visibility: _ => choice(/private\s/, /protected\s/),
  noncomputable: _ => /noncomputable\s/,

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
  where_struct_inst: $ => seq('where',
    optional(seq($._push_col, sepBy1($.struct_inst_field, choice($._eq_col_start, ';')))),
    optional($.where_decls)),
  decl_val: $ => choice($.decl_val_simple, $.decl_val_eqns, $.where_struct_inst),
  deriving: $ => seq('deriving' /* notFollowedBy 'instance' */, sepBy1($.ident, ',')),
  named_prio: $ => seq('(', 'priority', ':=', $.num_lit, ')'),
  ctor: $ => seq(optional($.documentation), '|', declModifiers($), $.ident, optDeclSig($)),
  computed_field: $ => seq(declModifiers($), $.ident, ':', $.term, $.match_alts),
  computed_fields: $ => prec.right(seq('with', optional(seq($._push_col, sepBy1($.computed_fields, $._eq_col_start))))),
  struct_explicit_binder: $ => seq(declModifiers($), '(', repeat1($.ident), optDeclSig($), optional(seq(':=', $.term)), ')'),
  struct_implicit_binder: $ => seq(declModifiers($), '{', repeat1($.ident), declSig($), '}'),
  struct_inst_binder: $ => seq(declModifiers($), '[', repeat1($.ident), declSig($), ']'),
  struct_simple_binder: $ => seq(declModifiers($), $.ident, optDeclSig($), optional(seq(':=', $.term))),
  struct_fields: $ => seq($._push_col, sepBy1(choice($.struct_explicit_binder,
    $.struct_implicit_binder, $.struct_inst_binder, $.struct_simple_binder), $._eq_col_start)),
  struct_ctor: $ => seq(declModifiers($), $.ident, '::'),
  struct_parent: $ => seq(optional(seq($.ident, ':')), $.term),
  extends: $ => seq('extends', sepBy1($.struct_parent, ','), optional($.type_spec)),
}
