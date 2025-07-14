/**
 * @file Lean literals
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const quotable = /[\\"'rnt]/
const hexDigit = /[0-9a-fA-F]/

export default {
  literal: $ => choice(
    $.name_lit,
    $.number,
    $.char_lit,
    $.str_lit,
    $.raw_str_lit,
  ),
  name_lit: $ => seq('\`', $.ident),
  number: _ => choice(
    /0[bB][01]+/,
    /0[oO][0-7]+/,
    /0[xX][0-9a-fA-F]+/,
    /[0-9]+/
  ),
  char_lit: _ => seq(
    '\'',
    choice(
      seq('\\', choice(
        quotable,
        seq('x', hexDigit, hexDigit),
        seq('u', hexDigit, hexDigit, hexDigit, hexDigit),
      )),
      /[^\n]/,
    ),
    '\'',
  ),
  str_lit: _ => seq(
    '"',
    repeat(choice(
      seq('\\', choice(
        quotable,
        seq('x', hexDigit, hexDigit),
        seq('u', hexDigit, hexDigit, hexDigit, hexDigit),
        '\n'
      )),
      /[^\\"\n]+/,
    )),
    '"',
  ),
  raw_str_lit: $ => seq(
    $._raw_str_start,
    alias($.raw_str_content, $.str_content),
    $._raw_str_end,
  ),
}
