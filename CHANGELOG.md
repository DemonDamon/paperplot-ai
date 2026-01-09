# Changelog

## [Unreleased] - January 9, 2026

### Added
- **`hierarchy-structure` Template Support**: Added full support for the `hierarchy-structure` infographic template from `@antv/infographic`. This enables the generation of professional layered architecture diagrams.
- **New `/layers` Command**: Added a quick command alias for generating layered architecture diagrams.
- **Enhanced AI System Prompt**: The AI prompt in `infographicService.ts` now includes detailed instructions and examples for the `hierarchy-structure` template, ensuring correct DSL generation.

### Changed
- **README.md**: Completely rewritten in English. The document now accurately reflects the project's capabilities, including the new architecture diagram feature.
- **INFOGRAPHIC_TEMPLATES.md**: Updated to include documentation for the `hierarchy-structure` template with correct DSL format examples.
- **`infographicService.ts`**: Refactored the `cleanDslOutput` function to correctly handle nested `children` structures required by the `hierarchy-structure` template.

### Fixed
- **Architecture Diagram Generation Issue**: Resolved the bug where prompts like "generate a layered architecture diagram" would fail to produce a valid diagram. The root cause was:
    1. The `hierarchy-structure` template was not included in the AI's system prompt.
    2. The DSL cleaning function did not correctly handle the nested `children` indentation required by this template.

---

*Author: Damon Li*
