# Security Rules

## Mandatory Checks Before Commit

1. No hardcoded API keys, tokens, or secrets in any file
2. All DOM-rendered user input passes through `esc()` function
3. WebSocket message data validated before arithmetic operations
4. Error messages do not expose internal state or stack traces
5. CORS proxy URLs are configurable, not duplicated as inline strings
6. AI endpoint URLs validated for format before fetch
7. No `innerHTML` assignments with unescaped interpolated values
8. Template literals in DOM context escape all dynamic content

## XSS Prevention

The `esc()` function escapes these characters: `& < > " '`

Rules:
- Every `innerHTML` assignment must use `esc()` for user-controlled values
- Search/filter inputs: escape before rendering in dropdown results
- Symbol names from external APIs: escape before DOM insertion
- Never use `eval()` or `new Function()` with user input
- Never construct HTML strings with unescaped API response data

## External Data Validation

- Binance API: validate that numeric fields are finite numbers before arithmetic
- Yahoo Finance: null-check quote arrays (`open`, `high`, `low`, `close`, `volume`) before indexing
- WebSocket messages: verify expected fields exist before destructuring
- AI endpoint responses: validate JSON structure before rendering

## Secret Management

- API keys must never appear in committed code
- Use environment variables or runtime configuration for sensitive values
- CORS proxy URLs are not secrets but should not be duplicated inline
- If adding new external service integrations, document required credentials in CLAUDE.md

## Security Response Protocol

When a security vulnerability is discovered:
1. STOP current work immediately
2. Fix the vulnerability before any other changes
3. Check the entire codebase for similar patterns
4. Document the fix in the commit message with `fix(xss):` or `fix(security):` prefix
5. Verify the fix does not break existing functionality
