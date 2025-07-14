import XCTest
import SwiftTreeSitter
import TreeSitterLean

final class TreeSitterLeanTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_lean())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Lean grammar")
    }
}
