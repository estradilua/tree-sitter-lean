/**
 * @file Grammar utilities
 * @author Lua Reis <me@lua.blog.br>
 * @license GPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export const sepBy1 = (p, sep) => seq(p, repeat(seq(sep, p)))

export const oneOf = ($, obj) => choice.apply(null, Object.keys(obj).map(k => $[k]))
