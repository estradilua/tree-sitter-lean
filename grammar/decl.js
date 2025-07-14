/**
 * @file Lean declarations
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const optDeclSig = $ => seq(
  repeat(choice($.binder_ident, $.bracketed_binder)),
  optional($.type_spec)
)

export default {
  documentation: _ => seq('/--', '-/'),
  attributes: _ => seq('@[', ']'),
  visibility: _ => choice('private', 'protected'),
  noncomputable: _ => 'noncomputable',

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

  decl_val_simple: $ => seq(':=', $.term, // $.termination_hints, optional($.where_decls)
  ),
  // decl_val_eqns: $ => seq($.match_alts, $.termination_hints, optional($.where_decls)),

  where_struct_inst: $ => seq('where', // $.struct_inst_fields, optional($.where_decls)
  ),

  decl_val: $ => choice($.decl_val_simple, // $.decl_val_eqns,
    $.where_struct_inst),

  abbrev: $ => seq('abbrev', $.decl_ident, optDeclSig($), $.decl_val),
  definition: $ => seq('def', $.decl_ident, optDeclSig($), $.decl_val),
}
