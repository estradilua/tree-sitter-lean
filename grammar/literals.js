/**
 * @file Lean literals
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const quotable = /[\\"'rnt]/

export default {
  literal: $ => choice(
    $.name_lit,
    $.num_lit,
    $.char_lit,
    $.str_lit,
    $.raw_str_lit,
  ),
  name_lit: $ => seq('\`', $.ident),
  num_lit: _ => choice(
    /0[bB][01]+/,
    /0[oO][0-7]+/,
    /0[xX][0-9a-fA-F]+/,
    // HACK: not checked to match Lean's scientific literal
    /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+\-]?\d+)?/
  ),
  char_lit: _ => seq(
    '\'',
    choice(
      seq('\\', choice(
        quotable,
        /x[a-fA-F\d]{2}/,
        /u[a-fA-F\d]{4}/,
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
        /x[a-fA-F\d]{2}/,
        /u[a-fA-F\d]{4}/,
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
