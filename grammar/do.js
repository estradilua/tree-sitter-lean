/**
 * @file Lean terms
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { optIdent, optType } from "./term.js";
import { many1Indent, oneOf } from "./util.js";

const do_elems = {
  do_let: $ => seq('let', optional('mut'), $.let_decl),
  do_let_else: $ => seq('let', optional('mut'), $.term, $.defeq, $.term, $.gt_col_bar, $.do_seq),
  do_let_expr: $ => seq('let_expr', $.match_expr_pat, $.defeq, $.term, $.gt_col_bar, $.do_seq),
  do_let_meta_expr: $ => seq('let_expr', $.match_expr_pat, $.left_arrow, $.term, $.gt_col_bar, $.do_seq),
  do_let_rec: $ => seq('let', 'rec', $.let_rec_decls),
  do_let_arrow: $ => seq('let', optional('mut'), choice($.do_id_decl, $.do_pat_decl)),
  do_reassign: $ => choice($.let_id_decl_no_binders, $.let_pat_decl),
  do_reassign_arrow: $ => choice($.do_id_decl, $.do_pat_decl),
  do_have: $ => seq('have', $.have_decl),
  do_if: $ => seq(
    'if', $.do_if_cond, 'then', $.do_seq,
    repeat(seq($.gt_col_else, 'if', $.do_if_cond, 'then', $.do_seq)),
    optional(seq($.gt_col_else, $.do_seq))
  ),

  do_expr: $ => $.term,
  do_nested: $ => seq(/do\s/, $.do_seq),
}

export default {
  ...do_elems,
  do_elem: $ => oneOf($, do_elems),
  do_seq_item: $ => seq($.do_elem, optional(';')),
  do_seq_bracketed: $ => seq('{', repeat1($.do_seq_item), '}'),
  do_seq_indent: $ => many1Indent($, $.do_seq_item),
  do_seq: $ => choice($.do_seq_bracketed, $.do_seq_indent),
  do_id_decl: $ => seq($.ident, optType($), $.left_arrow, $.do_elem),
  do_pat_decl: $ => prec.right(seq($.term, $.left_arrow, $.do_elem, optional(seq($.gt_col_bar, $.do_seq)))),
  do_if_let_pure: $ => seq($.defeq, $.term),
  do_if_let_bind: $ => seq($.left_arrow, $.term),
  do_if_let: $ => seq('let', $.term, choice($.do_if_let_pure, $.do_if_let_bind)),
  do_if_prop: $ => seq(optIdent($), $.term),
  do_if_cond: $ => choice($.do_if_let, $.do_if_prop),
}
