/**
 * @file Lean declarations
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { sepBy1 } from "./term.js";

const optDeclSig = $ => seq(
  repeat(choice($.binder_ident, $.bracketed_binder)),
  optional($.type_spec)
)

export default {
  attributes: _ => seq('@[', ']'),
  visibility: _ => choice(/private\s/, /protected\s/),
  noncomputable: _ => /noncomputable\s/,

  declaration: $ => seq(
    optional($.documentation),
    optional($.attributes),
    optional($.visibility),
    optional($.noncomputable),
    choice($.abbrev, $.definition),
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

  decl_val_simple: $ => seq(':=', $.term, // $.termination_hints, 
    optional($.where_decls)),
  decl_val_eqns: $ => seq($.match_alts),

  where_struct_inst: $ => seq(
    'where',
    optional(seq($._push_col, sepBy1($.struct_inst_field, choice($._eq_col_start, ';')))),
    optional($.where_decls)
  ),

  decl_val: $ => choice($.decl_val_simple, $.decl_val_eqns, $.where_struct_inst),

  abbrev: $ => seq(/abbrev\s/, $.decl_ident, optDeclSig($), $.decl_val),
  definition: $ => seq(/def\s/, $.decl_ident, optDeclSig($), $.decl_val),
}
