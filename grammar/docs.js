/**
 * @file Lean docs and comments
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default {
  markdown_code: $ => seq('`', repeat(/[^\s]/), '`'),
  documentation: $ => seq('/--', repeat(choice($.doc_code, /[^\s]/)) , '-/'),
}
