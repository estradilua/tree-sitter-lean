/**
 * @file Lean grammar for tree-sitter
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import cmds from './grammar/command.js';
import does from './grammar/do.js';
import lits from './grammar/literals.js';
import term from './grammar/term.js';
import modu, { header } from './grammar/module.js';
import sytx from './grammar/syntax.js';
import lvls from './grammar/level.js';
import tcts from './grammar/tactic.js';
import attr from './grammar/attr.js';

export default grammar({
  name: "lean",

  externals: $ => [
    $._raw_str_start,
    $.raw_str_content,
    $._raw_str_end,
    $.comment_body,
    $._push_col,
    $._pop_col,
    $._match_alts_start,
    $._match_alt_start,
    $._eq_col_start,
    $.gt_col_bar,
    $.gt_col_else,
    $._dedent,
    $.paren_open,
    $.paren_close,
    $.angle_open,
    $.angle_close,
    $.curly_open,
    $.curly_close,
    $.square_open,
    $.square_close,
    $._eof,
    $.__error_sentinel,
  ],

  rules: {
    module: $ => seq(
      header($),
      repeat($.command),
      $._eof,
    ),

    ...modu,
    ...cmds,
    ...does,
    ...lits,
    ...term,
    ...sytx,
    ...lvls,
    ...tcts,
    ...attr,

    comment: $ => seq('/-', $.comment_body, '-/'),
    line_comment: $ => /--[^\n]*\n/,
  },

  extras: $ => [/[\s\n]+/, $.comment, $.line_comment],
});
