package tree_sitter_lean_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_lean "github.com/estradilua/tree-sitter-lean/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_lean.Language())
	if language == nil {
		t.Errorf("Error loading Lean grammar")
	}
}
