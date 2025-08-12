/**
 * @file Lean commands
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { attrKind } from "./attr.js";
import { optType } from "./term.js";
import { many1Indent, manyIndent, oneOf, sepBy1, sepByIndentSemicolon } from "./util.js";

const declSig = $ => seq(repeat(choice($._binder_ident, $.bracketed_binder)), $.type_spec)
const optDeclSig = $ => seq(repeat(choice($._binder_ident, $.bracketed_binder)), optType($))

const declModifiers = $ => seq(
  optional($.documentation),
  optional($.attributes),
  optional($.visibility),
  optional($.noncomputable),
  optional('unsafe'),
  optional(choice('partial', 'norec'))
)

const commands = {
  cmd_module_doc: $ => seq('/-!', $.comment_body, '-/'),
  cmd_declaration: $ => seq(declModifiers($), oneOf($, declarations)),
  cmd_deriving: $ => seq('deriving', 'instance', sepBy1($.ident, ','), 'for', sepBy1($.ident, ',')),
  cmd_noncomputable_section: $ => seq('noncomputable', 'section', optional($.ident)),
  cmd_section: $ => seq('section', optional($.ident)),
  cmd_namespace: $ => seq('namespace', $.ident),
  cmd_end: $ => seq('end', optional($.ident)),
  cmd_variable: $ => seq('variable', repeat1($.bracketed_binder)),
  cmd_universe: $ => seq('universe', repeat1($.ident)),
  cmd_check: $ => seq('#check', $.term),
  cmd_check_failure: $ => seq('#check_failure', $.term),
  cmd_eval: $ => seq('#eval', $.term),
  cmd_eval_bang: $ => seq('#eval!', $.term),
  cmd_synth: $ => seq('#synth', $.term),
  cmd_exit: $ => '#exit',
  cmd_print: $ => seq('#print', choice($.ident, $.str_lit)),
  cmd_print_axioms: $ => seq('#print', 'axioms', $.ident),
  cmd_print_eqns: $ => seq('#print', choice('equations', 'eqns'), $.ident),
  cmd_print_tac_tags: $ => seq('#print', 'tactic', 'tags'),
  cmd_where: $ => '#where',
  cmd_version: $ => '#version',
  cmd_init_quot: $ => 'init_quot',
  cmd_set_option: $ => seq('set_option', $.ident, choice('true', 'false', $.str_lit, $.num_lit)),
  cmd_attribute: $ => seq('attribute', '[', sepBy1(choice(seq('-', $.ident), $.attr_instance), ','), ']', repeat1($.ident)),
  cmd_export: $ => seq('export', $.ident, '(', repeat1($.ident), ')'),
  cmd_open: $ => seq('open', $._open_decl),
  cmd_mutual: $ => 'mutual',
  cmd_initialize: $ => prec(100, seq(declModifiers($), choice(/initialize\s/, /builtin_initialize\s/),
    // HACK: see comment under POP_COL on scanner.c
    optional(seq($._push_col, $.ident, $.type_spec, $.left_arrow, $._pop_col)), $.do_seq)),
  cmd_in: $ => prec.right(seq($.command, /\sin\s/, $.command)),
  cmd_add_docstring: $ => seq($.documentation, 'add_decl_doc', $.ident),
  cmd_register_tactic_tag: $ => seq(optional($.documentation), 'register_tactic_tag', $.ident, $.str_lit),
  cmd_tactic_extension: $ => seq(optional($.documentation), 'tactic_extension', $.ident),
  cmd_recommended_spelling: $ => seq(optional($.documentation), 'recommended_spelling', $.str_lit, 'for',
    $.str_lit, 'in', '[', sepBy1($.ident, ','), ']'),
  cmd_gen_injective_theorems: $ => seq('gen_injective_theorems%', $.ident),
  cmd_include: $ => seq('include', repeat1($.ident)),
  cmd_omit: $ => seq('omit', repeat1(choice($.ident, $.inst_binder))),

  // Syntax.lean
  cmd_mixfix: $ => seq(optional($.documentation), optional($.attributes), attrKind($), $.mixfix_kind,
    $.precedence, optional($.named_name), optional($.named_prio), $.str_lit, $.darrow, $.term),
  cmd_notation: $ => seq(optional($.documentation), optional($.attributes), attrKind($), 'notation',
    optional($.precedence), optional($.named_name), optional($.named_prio), repeat($.notation_item),
    $.darrow, $.term),
  cmd_macro_rules: $ => seq(optional($.documentation), optional($.attributes), attrKind($), 'macro_rules',
    optional($.kind), $.match_alts),
  cmd_syntax: $ => seq(optional($.documentation), optional($.attributes), attrKind($), /syntax\s/,
    optional($.precedence), optional($.named_name), optional($.named_prio), repeat1($.syntax_p), ':',
    $.ident),
}

const declarations = {
  abbrev: $ => seq('abbrev', $.decl_ident, optDeclSig($), $.decl_val),
  definition: $ => prec.right(seq('def', $.decl_ident, optDeclSig($), $.decl_val, optional($.decl_deriving))),
  theorem: $ => seq(choice('theorem', 'lemma'), $.decl_ident, declSig($), $.decl_val),
  opaque: $ => seq('opaque', $.decl_ident, declSig($), $.decl_val_simple),
  instance: $ => seq(attrKind($), 'instance', optional($.named_prio),
    optional($.decl_ident), declSig($), $.decl_val),
  axiom: $ => seq('axiom', $.decl_ident, declSig($)),
  example: $ => seq('example', optDeclSig($), $.decl_val),
  inductive: $ => prec.right(seq('inductive', $.decl_ident, optDeclSig($),
    optional('where'), repeat($.ctor), optional($.computed_fields),
    optional($.decl_deriving))),
  class_inductive: $ => prec.right(seq('class', 'inductive', $.decl_ident, optDeclSig($),
    optional('where'), repeat($.ctor), optional($.decl_deriving))),
  structure: $ => prec.right(seq(choice('structure', 'class'), $.decl_ident,
    repeat($.bracketed_binder), optType($), optional($.extends),
    optional(seq('where', optional($.struct_ctor), optional($.struct_fields))),
    optional($.decl_deriving))),
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
  _open_decl: $ => oneOf($, open_decls),

  documentation: $ => seq('/--', $.comment_body, '-/'),
  visibility: _ => choice(/private\s/, /protected\s/),
  noncomputable: _ => /noncomputable\s/,

  decl_val_simple: $ => seq($.defeq, $.term, /* $.termination_hints */ optional($.where_decls)),
  decl_val_eqns: $ => seq($.match_alts, /* $.termination_hints */ optional($.where_decls)),
  where_struct_inst: $ => seq('where', sepByIndentSemicolon($, $.struct_inst_field), optional($.where_decls)),
  decl_val: $ => choice($.decl_val_simple, $.decl_val_eqns, $.where_struct_inst),
  decl_deriving: $ => seq('deriving' /* notFollowedBy 'instance' */, sepBy1($.ident, ',')),
  named_prio: $ => seq('(', $._o, 'priority', $.defeq, $.num_lit, ')', $._c),
  ctor: $ => seq(optional($.documentation), '|', declModifiers($), $.ident, optDeclSig($)),
  computed_field: $ => seq(declModifiers($), $.ident, ':', $.term, $.match_alts),
  computed_fields: $ => prec.right(seq('with', manyIndent($, $.computed_fields))),
  struct_explicit_binder: $ => seq(declModifiers($), '(', $._o, $.ident, optDeclSig($),
    optional(seq($.defeq, $.term)), ')', $._c),
  struct_implicit_binder: $ => seq(declModifiers($), '{', $.ident, declSig($), '}'),
  struct_inst_binder: $ => seq(declModifiers($), '[', $.ident, declSig($), ']'),
  struct_simple_binder: $ => seq(declModifiers($), $.ident, optDeclSig($), optional(seq($.defeq, $.term))),
  struct_fields: $ => many1Indent($, choice($.struct_explicit_binder, $.struct_implicit_binder,
    $.struct_inst_binder, $.struct_simple_binder)),
  struct_ctor: $ => seq(declModifiers($), $.ident, '::'),
  struct_parent: $ => seq(optional(seq($.term_ident, ':')), $.term),
  extends: $ => seq('extends', sepBy1($.struct_parent, ','), optType($)),

  // Syntax.lean
  mixfix_kind: $ => choice('prefix', 'infix', 'infixl', 'infixr', 'postfix'),
  named_name: $ => seq('(', 'name', $.defeq, $.ident, ')'),
  notation_item: $ => choice($.str_lit, seq($.ident, optional($.precedence))),
  kind: $ => seq('(', 'kind', $.defeq, $.ident, ')'),
}
