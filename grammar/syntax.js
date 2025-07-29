/**
 * @file Lean commands
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />

import { oneOf } from "./util.js"

// @ts-check

const syntax = {
  paren: $ => seq('(', repeat1($.syntax_p), ')'),
  cat: $ => prec.right(seq($.ident, optional($.precedence))),
  unary: $ => seq($.ident, token.immediate('('), repeat1($.syntax_p), ')'),
  binary: $ => seq($.ident, token.immediate('('), repeat1($.syntax_p), ',', repeat1($.syntax_p), ')'),
  sep_by: $ => seq('sepBy(', repeat1($.syntax_p), ',', $.str_lit, optional(seq(',', repeat1($.syntax_p))),
    optional(seq(',', 'allowTrailingSep')), ')'),
  sep_by_1: $ => seq('sepBy1(', repeat1($.syntax_p), ',', $.str_lit, optional(seq(',', repeat1($.syntax_p))),
    optional(seq(',', 'allowTrailingSep')), ')'),
  atom: $ => $.str_lit,
  non_reserved: $ => seq('&', $.str_lit),
}

export default {
  ...syntax,
  syntax_p: $ => oneOf($, syntax),

  precedence: $ => seq(':', $.num_lit),
}
