/**
 * @file Grammar utilities
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export const sepBy1 = (p, sep, trailing = false) => trailing ?
  seq(p, repeat(seq(sep, p))) : seq(p, repeat(seq(sep, p)), optional(sep))

export const sepBy = (p, sep, trailing = false) => optional(sepBy1(p, sep, trailing))

export const sepBy1Indent = ($, p, sep, trailing = false) => trailing ?
  seq(
    $._push_col,
    sepBy1(p, choice($._eq_col_start, sep)),
    optional(sep),
    $._dedent
  ) : seq(
    $._push_col,
    sepBy1(p, choice($._eq_col_start, sep)),
    $._dedent
  )

export const sepByIndent = ($, p, sep, trailing = false) => optional(sepBy1Indent($, p, sep, trailing))


export const sepByIndentSemicolon = ($, p) => sepByIndent($, p, ';', true)
export const sepBy1IndentSemicolon = ($, p) => sepBy1Indent($, p, ';', true)

export const many1Indent = ($, p) => seq($._push_col, sepBy1(p, $._eq_col_start), $._dedent)

export const manyIndent = ($, p) => optional(many1Indent($, p))

export const oneOf = ($, obj) => choice.apply(null, Object.keys(obj).map(k => $[k]))
