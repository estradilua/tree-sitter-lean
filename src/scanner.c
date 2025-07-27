#include "tree_sitter/array.h"
#include "tree_sitter/parser.h"

#include <stdint.h>
#include <wctype.h>

enum TokenType {
  RAW_STRING_LITERAL_START,
  RAW_STRING_LITERAL_CONTENT,
  RAW_STRING_LITERAL_END,

  COMMENT_BODY,

  PUSH_COL,
  MATCH_ALTS_START,
  MATCH_ALT_START,
  EQ_COL_START,
  GT_COL_BAR,
  GT_COL_ELSE,
  DEDENT,

  ERROR_SENTINEL,
};

typedef struct {
  uint8_t opening_hash_count;
  Array(uint8_t) cols;
} Scanner;

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }
static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }
static inline bool eof(TSLexer *lexer) { return lexer->eof(lexer); }

static inline bool scan_raw_string_start(Scanner *scanner, TSLexer *lexer) {
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
    if (eof(lexer)) {
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

  lexer->log(
      lexer,
      "valid symbols: start=%d, content=%d, end=%d, push_col=%d, "
      "alts_start=%d, alt_start=%d, eq_col_start=%d, gt_col_bar=%d, dedent=%d, "
      "error_sentinel=%d",
      valid_symbols[RAW_STRING_LITERAL_START],
      valid_symbols[RAW_STRING_LITERAL_CONTENT],
      valid_symbols[RAW_STRING_LITERAL_END], valid_symbols[PUSH_COL],
      valid_symbols[MATCH_ALTS_START], valid_symbols[MATCH_ALT_START],
      valid_symbols[EQ_COL_START], valid_symbols[GT_COL_BAR],
      valid_symbols[DEDENT], valid_symbols[ERROR_SENTINEL]);

  // eof or error recovery
  if (valid_symbols[ERROR_SENTINEL] || eof(lexer))
    return false;

  if (valid_symbols[RAW_STRING_LITERAL_CONTENT]) {
    lexer->result_symbol = RAW_STRING_LITERAL_CONTENT;
    return scan_raw_string_content(scanner, lexer);
  }

  if (valid_symbols[RAW_STRING_LITERAL_END]) {
    lexer->result_symbol = RAW_STRING_LITERAL_END;
    return scan_raw_string_end(scanner, lexer);
  }

  if (valid_symbols[COMMENT_BODY]) {
    lexer->result_symbol = COMMENT_BODY;
    uint8_t nesting = 0;
    char previous = false;
    while (!eof(lexer)) {
      advance(lexer);
      if (lexer->lookahead == '/') {
        if (previous == '-') {
          if (!nesting)
            return true;
          nesting--;
          previous = false;
        } else {
          previous = '/';
        }
      } else if (lexer->lookahead == '-') {
        if (previous == '/') {
          nesting++;
          previous = false;
        } else {
          previous = '-';
          lexer->mark_end(lexer);
        }
      } else {
        previous = false;
      }
    }
    return true;
  }

  bool skipped_newline = false;
  while (!eof(lexer)) {
    if (lexer->lookahead == '\n')
      skipped_newline = true;
    else if (!iswspace(lexer->lookahead))
      break;
    skip(lexer);
  }

  uint8_t indent = lexer->get_column(lexer);

  lexer->log(lexer, "newline: %d", skipped_newline);

  if (valid_symbols[DEDENT] && skipped_newline && scanner->cols.size &&
      indent < *array_back(&scanner->cols)) {
    lexer->result_symbol = DEDENT;
    return true;
  }

  if (eof(lexer))
    return false;

  if (valid_symbols[RAW_STRING_LITERAL_START] && lexer->lookahead == 'r') {
    lexer->result_symbol = RAW_STRING_LITERAL_START;
    return scan_raw_string_start(scanner, lexer);
  }

  if (valid_symbols[PUSH_COL]) {
    lexer->result_symbol = PUSH_COL;
    array_push(&scanner->cols, indent);
    return true;
  }

  if (lexer->lookahead == '|' && valid_symbols[GT_COL_BAR] &&
      scanner->cols.size && indent > *array_back(&scanner->cols)) {
    advance(lexer);
    lexer->result_symbol = GT_COL_BAR;
    return true;
  }

  if (lexer->lookahead == '|' &&
      (valid_symbols[MATCH_ALTS_START] ||
       valid_symbols[MATCH_ALT_START] && scanner->cols.size &&
           indent >= *array_back(&scanner->cols))) {

    lexer->mark_end(lexer);
    skip(lexer);

    // check for '=>' construct
    uint8_t state = 0;
    for (;;) {
      if (eof(lexer))
        return false;
      else if (lexer->lookahead == '=')
        state = 1;
      else if (state == 1 && lexer->lookahead == '>')
        break;
      else
        state = 0;

      skip(lexer);
    }

    if (valid_symbols[MATCH_ALTS_START]) {
      lexer->result_symbol = MATCH_ALTS_START;
      array_push(&scanner->cols, indent);
      return true;
    } else {
      lexer->result_symbol = MATCH_ALT_START;
      return true;
    }
  }

  if (lexer->lookahead == 'e' && valid_symbols[GT_COL_ELSE] &&
      scanner->cols.size && indent > *array_back(&scanner->cols)) {
    advance(lexer);
    if (eof(lexer) || lexer->lookahead != 'l')
      return false;
    advance(lexer);
    if (eof(lexer) || lexer->lookahead != 's')
      return false;
    advance(lexer);
    if (eof(lexer) || lexer->lookahead != 'e')
      return false;
    advance(lexer);
    lexer->result_symbol = GT_COL_ELSE;
    return true;
  }

  if (valid_symbols[EQ_COL_START] && skipped_newline && scanner->cols.size &&
      indent == *array_back(&scanner->cols)) {
    lexer->result_symbol = EQ_COL_START;
    return true;
  }

  return false;
}

unsigned tree_sitter_lean_external_scanner_serialize(void *payload,
                                                     char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  size_t size = 0;
  buffer[size++] = scanner->opening_hash_count;
  for (unsigned i = 0; i < scanner->cols.size; i++) {
    buffer[size++] = *array_get(&scanner->cols, i);
  }
  return size;
}

void tree_sitter_lean_external_scanner_deserialize(void *payload,
                                                   const char *buffer,
                                                   unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  array_delete(&scanner->cols);
  if (length > 0) {
    size_t size = 0;
    scanner->opening_hash_count = buffer[size++];
    for (; size < length; size++) {
      array_push(&scanner->cols, buffer[size]);
    }
  }
}

void *tree_sitter_lean_external_scanner_create() {
  Scanner *scanner = ts_calloc(1, sizeof(Scanner));
  array_init(&scanner->cols);
  return scanner;
}

void tree_sitter_lean_external_scanner_destroy(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  array_delete(&scanner->cols);
  ts_free(scanner);
}
