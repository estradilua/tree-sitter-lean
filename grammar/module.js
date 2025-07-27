/**
 * @file Lean grammar for tree-sitter
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default {
  import: $ => seq(optional('private'), 'import', optional('all'), $.ident),
}

export const header = $ => seq(optional('module'), optional('prelude'), repeat($.import))
