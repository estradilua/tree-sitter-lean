#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"
#include <wctype.h>

enum TokenType {
  RAW_STRING_LITERAL_START,
  RAW_STRING_LITERAL_CONTENT,
  RAW_STRING_LITERAL_END
};

typedef struct {
  uint8_t opening_hash_count;
} Scanner;

void *tree_sitter_lean_external_scanner_create() {
  return ts_calloc(1, sizeof(Scanner));
}

void tree_sitter_lean_external_scanner_destroy(void *payload) {
  ts_free((Scanner *)payload);
}

unsigned tree_sitter_lean_external_scanner_serialize(void *payload,
                                                     char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  buffer[0] = (char)scanner->opening_hash_count;
  return 1;
}

void tree_sitter_lean_external_scanner_deserialize(void *payload,
                                                   const char *buffer,
                                                   unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  scanner->opening_hash_count = 0;
  if (length == 1) {
    Scanner *scanner = (Scanner *)payload;
    scanner->opening_hash_count = buffer[0];
  }
}

static void skip_whitespace(TSLexer *lexer) {
  while (iswspace(lexer->lookahead) && !lexer->eof(lexer)) {
    lexer->advance(lexer, true);
  }
}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline bool scan_raw_string_start(Scanner *scanner, TSLexer *lexer) {
  skip_whitespace(lexer);
  if (lexer->lookahead != 'r') {
    return false;
  }
  advance(lexer);

  uint8_t opening_hash_count = 0;
  while (lexer->lookahead == '#') {
    advance(lexer);
    opening_hash_count++;
  }

  if (lexer->lookahead != '"') {
    return false;
  }
  advance(lexer);
  scanner->opening_hash_count = opening_hash_count;

  return true;
}

static inline bool scan_raw_string_content(Scanner *scanner, TSLexer *lexer) {
  if (scanner->opening_hash_count == 0) {
    return false;
  }
  for (;;) {
    if (lexer->eof(lexer)) {
      return false;
    }
    if (lexer->lookahead == '"') {
      lexer->mark_end(lexer);
      advance(lexer);
      unsigned hash_count = 0;
      while (lexer->lookahead == '#' &&
             hash_count < scanner->opening_hash_count) {
        advance(lexer);
        hash_count++;
      }
      if (hash_count == scanner->opening_hash_count) {
        return true;
      }
    } else {
      advance(lexer);
    }
  }
}

static inline bool scan_raw_string_end(Scanner *scanner, TSLexer *lexer) {
  if (lexer->lookahead != '"') {
    return false;
  }
  advance(lexer);
  for (unsigned i = 0; i < scanner->opening_hash_count; i++) {
    advance(lexer);
  }
  scanner->opening_hash_count = 0;
  return true;
}

bool tree_sitter_lean_external_scanner_scan(void *payload, TSLexer *lexer,
                                            const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;

  if (valid_symbols[RAW_STRING_LITERAL_START]) {
    lexer->result_symbol = RAW_STRING_LITERAL_START;
    return scan_raw_string_start(scanner, lexer);
  }

  if (valid_symbols[RAW_STRING_LITERAL_CONTENT]) {
    lexer->result_symbol = RAW_STRING_LITERAL_CONTENT;
    return scan_raw_string_content(scanner, lexer);
  }

  if (valid_symbols[RAW_STRING_LITERAL_END]) {
    lexer->result_symbol = RAW_STRING_LITERAL_END;
    return scan_raw_string_end(scanner, lexer);
  }

  return false;
}
