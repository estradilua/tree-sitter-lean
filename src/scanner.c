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

  // POP_COL is used to disabiguate when PUSH_COL is parsed
  // but Lean's parser would have tried to parse something else
  // first. (tree-sitter sees PUSH_COL as a token, when in reality
  // it just pushes a column onto the stack). The following example
  // illustrates this well:
  //
  // initialize
  //   foo : Int ← pure 2
  //
  // Here, tree-sitter would insert a PUSH_COL token right after the
  // 'initialize' keyword (because 'initialize [DO_SEQ BLOCK]' is valid)
  // while it should have been greedy and parsed the 'foo : Int ←' before
  // PUSH_COL. To fix this, we make PUSH_COL a valid symbol for the named
  // 'initialize' rule, and then we add a POP_COL token right after it.
  POP_COL,

  MATCH_ALTS_START,
  MATCH_ALT_START,
  EQ_COL_START,
  GT_COL_BAR,
  GT_COL_ELSE,
  DEDENT,

  PAREN_OPEN,
  PAREN_CLOSE,
  ANGLE_OPEN,
  ANGLE_CLOSE,
  CURLY_OPEN,
  CURLY_CLOSE,
  SQUARE_OPEN,
  SQUARE_CLOSE,

  END_OF_FILE,
  ERROR_SENTINEL,
};

typedef struct {
  uint8_t opening_hash_count;
  Array(uint8_t) cols;
} Scanner;

// we use this to indicate parenthesis enclosures, simulating 'withoutPosition'
#define PAREN 0

#define SCAN_DELIMITER(c_open, c_close, sym_open, sym_close)                   \
  if (valid_symbols[sym_open] && lexer->lookahead == c_open) {                 \
    advance(lexer);                                                            \
    lexer->result_symbol = sym_open;                                           \
    lexer->mark_end(lexer);                                                    \
    array_push(&scanner->cols, PAREN);                                         \
    return true;                                                               \
  }                                                                            \
  if (valid_symbols[sym_close] && lexer->lookahead == c_close &&               \
      scanner->cols.size && *array_back(&scanner->cols) == PAREN) {            \
    advance(lexer);                                                            \
    lexer->result_symbol = sym_close;                                          \
    lexer->mark_end(lexer);                                                    \
    array_pop(&scanner->cols);                                                 \
    return true;                                                               \
  }

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

  lexer->mark_end(lexer);
  return true;
}

static inline bool scan_raw_string_content(Scanner *scanner, TSLexer *lexer) {
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
      "valid symbols: raw_start=%d, raw_content=%d, raw_end=%d, push_col=%d, "
      "pop_col=%d, match_alts_start=%d, match_alt_start=%d, eq_col_start=%d, "
      "gt_col_bar=%d, gt_col_else=%d, dedent=%d, paren_open=%d, "
      "paren_close=%d, end_of_file=%d, error_sentinel=%d",
      valid_symbols[RAW_STRING_LITERAL_START],
      valid_symbols[RAW_STRING_LITERAL_CONTENT],
      valid_symbols[RAW_STRING_LITERAL_END], valid_symbols[PUSH_COL],
      valid_symbols[POP_COL], valid_symbols[MATCH_ALTS_START],
      valid_symbols[MATCH_ALT_START], valid_symbols[EQ_COL_START],
      valid_symbols[GT_COL_BAR], valid_symbols[GT_COL_ELSE],
      valid_symbols[DEDENT], valid_symbols[PAREN_OPEN],
      valid_symbols[PAREN_CLOSE], valid_symbols[END_OF_FILE],
      valid_symbols[ERROR_SENTINEL]);

  // eof or error recovery
  bool exceptional = valid_symbols[ERROR_SENTINEL] || eof(lexer);

  if (!exceptional && valid_symbols[POP_COL] && scanner->cols.size) {
    lexer->result_symbol = POP_COL;
    array_pop(&scanner->cols);
    return true;
  }

  if (scanner->opening_hash_count &&
      valid_symbols[RAW_STRING_LITERAL_CONTENT]) {
    lexer->result_symbol = RAW_STRING_LITERAL_CONTENT;
    return scan_raw_string_content(scanner, lexer);
  }

  if (scanner->opening_hash_count && valid_symbols[RAW_STRING_LITERAL_END]) {
    lexer->result_symbol = RAW_STRING_LITERAL_END;
    return scan_raw_string_end(scanner, lexer);
  }

  if (!exceptional && valid_symbols[COMMENT_BODY]) {
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

  // necessary for DEDENT, which must consume nothing
  lexer->mark_end(lexer);

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

  // it should be possible for many DEDENT tokens to be parsed in quick
  // succession. this is necessary in order to close multiple indented blocks
  // which end at the same time. to support this, DEDENT does not consume any
  // characters, so that it continues generating tokens until all the
  // extra indentation is removed from the stack.
  if (valid_symbols[DEDENT] && skipped_newline && scanner->cols.size &&
      indent < *array_back(&scanner->cols)) {
    array_pop(&scanner->cols);
    lexer->result_symbol = DEDENT;
    return true;
  }

  if (eof(lexer) && valid_symbols[END_OF_FILE]) {
    lexer->result_symbol = END_OF_FILE;
    lexer->mark_end(lexer);
    return true;
  }

  if (exceptional || eof(lexer))
    return false;

  if ((lexer->lookahead == ')' || lexer->lookahead == ']' ||
       lexer->lookahead == '}' || lexer->lookahead == 10217 ||
       lexer->lookahead == ',') &&
      valid_symbols[DEDENT] && scanner->cols.size &&
      *array_back(&scanner->cols) != PAREN) {
    array_pop(&scanner->cols);
    lexer->result_symbol = DEDENT;
    return true;
  }

  if (valid_symbols[PUSH_COL] &&
      (!scanner->cols.size || indent > *array_back(&scanner->cols))) {
    lexer->result_symbol = PUSH_COL;
    lexer->mark_end(lexer);
    array_push(&scanner->cols, indent);
    return true;
  }

  if (valid_symbols[EQ_COL_START] && skipped_newline && scanner->cols.size &&
      indent == *array_back(&scanner->cols)) {
    lexer->result_symbol = EQ_COL_START;
    lexer->mark_end(lexer);
    return true;
  }

  if (lexer->lookahead == '|' && valid_symbols[GT_COL_BAR] &&
      scanner->cols.size && indent > *array_back(&scanner->cols)) {
    advance(lexer);
    lexer->result_symbol = GT_COL_BAR;
    lexer->mark_end(lexer);
    return true;
  }

  SCAN_DELIMITER('(', ')', PAREN_OPEN, PAREN_CLOSE)
  SCAN_DELIMITER('[', ']', SQUARE_OPEN, SQUARE_CLOSE)
  SCAN_DELIMITER('{', '}', CURLY_OPEN, CURLY_CLOSE)
  SCAN_DELIMITER(10216, 10217, ANGLE_OPEN, ANGLE_CLOSE)

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
    lexer->mark_end(lexer);
    lexer->result_symbol = GT_COL_ELSE;
    return true;
  }

  if (valid_symbols[RAW_STRING_LITERAL_START] && lexer->lookahead == 'r') {
    lexer->result_symbol = RAW_STRING_LITERAL_START;
    return scan_raw_string_start(scanner, lexer);
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
