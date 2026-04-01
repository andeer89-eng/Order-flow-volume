# Repository Pattern Analysis: everything-claude-code -> Order Flow Volume

> Cross-repository analysis identifying actionable patterns from
> [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)
> that benefit the Order Flow Volume trading dashboard project.

---

## Analysis

### Source Repository Overview

**everything-claude-code** (ECC) is a comprehensive agent harness performance
optimization system for AI development environments. Winner of an Anthropic
hackathon, it provides:

- **30+ specialized agents** for task delegation (security review, code review,
  architecture, TDD, build error resolution)
- **136+ skills** covering frameworks, languages, and workflows
- **60+ slash commands** for rapid development operations
- **Lifecycle hooks** (PreToolUse, PostToolUse, Stop, SessionStart/End) for
  automated validation, formatting, and security checks
- **MCP server configurations** for GitHub, memory, sequential thinking,
  browser automation
- **Modular rules system** with per-language and per-domain guidelines
- **Context injection** (dev, review, research modes)
- **Cross-platform support** (Windows, macOS, Linux)

Architecture: plugin-based with Markdown + YAML frontmatter for agent/skill
definitions. Hooks use matcher-driven JSON with shell/Node entrypoints. Rules
cascade from `rules/common/` to language-specific directories.

### Target Project: Order Flow Volume

A single-page trading dashboard (~3,950 lines in one `index.html`) with:

- Canvas-based charting (TradingView-style pan/zoom)
- Real-time WebSocket streaming from Binance
- REST polling via Yahoo Finance (through CORS proxies)
- Pine Script v6 indicator with VWAP, EMA, RSI, CVD, divergence detection
- Backtest engine, manual trading module, MTF confluence matrix
- localStorage persistence

**Current gaps**: No CLAUDE.md, no `.gitignore`, no CI/CD, no tests, no
linting, no build system, monolithic single-file architecture.

---

## Valuable Elements

### 1. CLAUDE.md Project Configuration

**What it is**: A project-root file that gives Claude Code persistent context
about the project's architecture, conventions, critical rules, and available
commands. ECC provides both a generic template and real-world examples (SaaS,
Django, Go microservices, Rust APIs).

**Why it's valuable**: The Order Flow Volume project has zero Claude Code
configuration. Every session starts from scratch with no knowledge of the
project's conventions, data flow architecture, or critical gotchas (CORS proxy
requirements, WebSocket field mappings, Pine Script parity constraints).

**Key patterns from ECC**:
- Project overview with tech stack declaration
- Critical rules section (code style, security, testing)
- File structure documentation
- Environment variables listing
- Available workflow commands
- Git workflow conventions

### 2. Security Rules & Automated Scanning

**What it is**: ECC's `rules/common/security.md` enforces 8 mandatory
pre-commit checks: no hardcoded secrets, input validation, XSS/SQL injection
prevention, CSRF protection, auth verification, rate limiting, and safe error
messages. The `security-reviewer` agent automates OWASP Top 10 scanning.

**Why it's valuable**: The Order Flow Volume dashboard was found to have an XSS
vulnerability in the dropdown search (now fixed), and handles external API data
from Binance/Yahoo without schema validation. The AI endpoint configuration
accepts user-provided URLs. Establishing security rules prevents regression.

**Key patterns**:
- Mandatory security checklist before every commit
- Secret management rules (env vars, never hardcode)
- "STOP immediately" protocol for discovered vulnerabilities
- Defense-in-depth philosophy

### 3. Coding Style Rules with File Size Limits

**What it is**: ECC's `rules/common/coding-style.md` enforces immutability,
200-400 line file targets (800 max), functions under 50 lines, max 4 nesting
levels, and no silent error swallowing.

**Why it's valuable**: `index.html` is ~3,950 lines in a single file - nearly
5x the recommended maximum. The global mutable state object `S` violates
immutability principles. These rules would guide the eventual refactoring into
a modular architecture.

**Key rules applicable**:
- File decomposition targets (200-400 lines)
- Function length limits (< 50 lines)
- Nesting depth limits (max 4 levels)
- Named constants instead of magic numbers
- Immutable state updates

### 4. Git Workflow Rules & Conventional Commits

**What it is**: ECC's `rules/common/git-workflow.md` standardizes commit
messages using conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`,
`test:`, `perf:`), requires PR reviews, and mandates test execution before merge.

**Why it's valuable**: The Order Flow Volume project has only 8 commits with
inconsistent message styles. Establishing conventions now, while the project is
young, prevents technical debt accumulation.

**Applicable conventions**:
- `feat:` for new features
- `fix:` for bug fixes
- `perf:` for performance improvements
- `refactor:` for code restructuring
- Feature branches from `main`, PRs required

### 5. Hooks System for Automated Quality Gates

**What it is**: ECC's hooks system provides lifecycle automation:
- **PreToolUse**: Git security enforcement, commit quality checks, secret
  detection, documentation warnings
- **PostToolUse**: Auto-formatting, type checking, console.log warnings
- **Stop**: Session persistence, console.log detection, metrics tracking

**Why it's valuable**: The project currently has no automated quality gates.
Hooks can catch regressions (like the XSS fix reverting), enforce formatting
consistency in the monolithic file, and detect accidental secret exposure in
API endpoint configurations.

**Most relevant hooks**:
- Secret detection on commit (API keys, CORS proxy URLs)
- Code compaction suggestions (for the large file)
- Session state persistence
- Build/lint verification

### 6. Testing Framework & TDD Workflow

**What it is**: ECC enforces minimum 80% test coverage via
`rules/common/testing.md` with a strict TDD workflow: write test (RED), confirm
failure, implement (GREEN), confirm pass, refactor.

**Why it's valuable**: The Order Flow Volume project has zero test coverage. The
indicator engine (EMA, RSI, VWAP, CVD calculations), bar aggregation functions,
and backtest engine are pure functions that are highly testable. The RSI
implementation uses Wilder's smoothing, which is easy to verify against known
reference values.

**Priority test targets**:
1. `calcRSI()` - Wilder's smoothing correctness
2. `sma()`, `ema()` - Moving average calculations
3. `_mapBinanceBar()`, `_mapYahooBar()` - Data mapping accuracy
4. `aggregate4hBars()` - Bar aggregation boundaries
5. `recalcCumVolume()` - Incremental cumulative volume
6. `esc()` - XSS sanitization completeness
7. Backtest engine P&L calculations

### 7. Performance Rules & Model Selection

**What it is**: ECC's `rules/common/performance.md` provides guidelines for
context window management, model selection (Haiku for lightweight tasks, Sonnet
for coding, Opus for architecture), and build troubleshooting protocols.

**Why it's valuable**: Working on a 3,950-line single file consumes significant
context. Proper model selection and context management strategies help maintain
productivity when editing the dashboard.

**Applicable patterns**:
- Avoid large refactors in final 20% of context
- Use sub-agents for isolated analysis tasks
- Extended thinking for complex indicator logic

### 8. Code Review Agent Pattern

**What it is**: ECC's `code-reviewer` agent applies a severity-based checklist
(CRITICAL > HIGH > MEDIUM > LOW) examining security, code quality, performance,
and best practices. It reads git diffs, examines surrounding context, and
provides before/after code examples.

**Why it's valuable**: As a single-developer project with a monolithic
codebase, automated code review catches issues that manual review misses. The
severity classification helps prioritize fixes in a large file.

**Severity mapping for Order Flow Volume**:
- CRITICAL: XSS, secret exposure, WebSocket data corruption
- HIGH: Functions > 50 lines, missing error handling, data validation gaps
- MEDIUM: O(n^2) algorithms, unnecessary redraws, magic numbers
- LOW: Naming consistency, documentation gaps

### 9. MCP Server Configurations

**What it is**: ECC configures 6 MCP servers including GitHub (for PR/issue
management), Memory (persistent knowledge), Sequential Thinking (complex
reasoning), and Playwright (browser automation/testing).

**Why it's valuable**: The Memory MCP would preserve cross-session knowledge
about the project's complex data flow architecture. Sequential Thinking aids
debugging intricate indicator logic. Playwright could automate visual testing
of the canvas-based chart.

**Most relevant configs**:
- `@modelcontextprotocol/server-github` - Issue/PR management
- `@modelcontextprotocol/server-memory` - Project knowledge persistence
- `@playwright/mcp` - Browser-based testing of the dashboard

### 10. Context Injection System

**What it is**: ECC's `contexts/` directory provides mode-specific behavior
profiles (dev, review, research). The dev context prioritizes "get it working >
get it right > get it clean" and favors working solutions over perfect ones.

**Why it's valuable**: Different work modes require different approaches for the
dashboard. Development mode should focus on feature implementation, review mode
on security and correctness, and research mode on indicator algorithm analysis.

---

## Implementation Recommendations

### Priority 1: Create CLAUDE.md (Immediate, Low Risk)

Create a project-specific CLAUDE.md following ECC's template pattern.

```markdown
# Order Flow Volume - Trading Dashboard

## Project Overview
Single-page real-time trading dashboard with canvas-based charting.

**Stack**: Vanilla HTML/CSS/JS (no build system), Binance WebSocket + REST,
Yahoo Finance REST (via CORS proxies), Canvas 2D API, localStorage

**Pine Script**: `order_flow_elite.pine` - TradingView indicator that the JS
engine must maintain parity with.

## Architecture
Single file: `index.html` (~3,950 lines) containing embedded CSS, HTML, and JS.

### Global State
All mutable state lives in the `S` object. Key properties:
- `S.bars[]` - OHLCV+delta bar array (max 300)
- `S.sym` - Current ticker symbol
- `S.ws` - Active WebSocket connection
- `S.htfVols[]` - Higher timeframe volume aggregates

### Data Sources
- **Crypto**: Binance REST (`/api/v3/klines`) + WebSocket (`/ws/{sym}@kline_{interval}`)
- **Stocks/ETFs**: Yahoo Finance via `corsproxy.io` or `allorigins.win` (CORS proxies)
- **Intervals**: 1m, 5m, 15m, 1h, 4h (4h aggregated client-side from 1h for Yahoo)

## Critical Rules

### Security
- All user input rendered in DOM MUST pass through `esc()` function
- Never expose API keys in committed code
- CORS proxy URLs are not secrets but should be configurable
- The AI endpoint field accepts user URLs - validate before use

### Indicator Parity
- JS indicator engine MUST match Pine Script logic in `order_flow_elite.pine`
- RSI uses Wilder's smoothing (period 14, OB=65, OS=35)
- Entry signals require: trend + htfSpike + RSI filter + divergence + !exhaust

### WebSocket Data
- Taker buy volume uses field `k.V` (base asset), NOT `k.Q` (quote asset)
- Bar updates: same-timestamp = update in place, new timestamp = push new bar
- Connection uses exponential backoff on failure

### Performance
- `recalcCumVolume()` uses incremental tracking, not O(n) reduce
- Canvas redraws throttled via `scheduleRedraw()` / `requestAnimationFrame`
- Bar array capped at 300 entries

## File Structure
```
index.html              # Monolithic dashboard (CSS + HTML + JS)
order_flow_elite.pine   # TradingView Pine Script v6 indicator
CODEBASE_ANALYSIS.md    # Detailed codebase analysis
```

## Git Workflow
- Conventional commits: `feat:`, `fix:`, `perf:`, `refactor:`
- Feature branches from `main`
- Test indicator calculations against known reference values before merge
```

**Steps**:
1. Create `CLAUDE.md` at project root
2. Commit with `docs: add CLAUDE.md project configuration`
3. Update as architecture evolves

### Priority 2: Add .gitignore (Immediate, Low Risk)

```gitignore
# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# Dependencies (future)
node_modules/

# Build output (future)
dist/
build/
```

### Priority 3: Security Rules File (Low Complexity, High Impact)

Create `.claude/rules/security.md`:

```markdown
# Security Rules

## Mandatory Checks Before Commit
1. No hardcoded API keys, tokens, or secrets
2. All DOM-rendered user input passes through `esc()`
3. WebSocket message data validated before use
4. Error messages don't expose internal state
5. CORS proxy URLs configurable, not hardcoded

## XSS Prevention
- `esc()` escapes: & < > " '
- Every `innerHTML` assignment must use escaped values
- Template literals in DOM context must escape interpolated values
- Search/filter inputs: escape before rendering in dropdown

## External Data Validation
- Binance API responses: validate numeric fields before arithmetic
- Yahoo Finance: null-check quote arrays before indexing
- AI endpoint: validate URL format before fetch
```

### Priority 4: Implement Basic Testing (Medium Complexity, High Impact)

The indicator functions are pure and testable. Create a minimal test harness:

```javascript
// tests/indicators.test.js (run with Node.js)
// Extract functions from index.html into testable modules (future)
// For now, copy-paste functions and test independently

function calcRSI(closes, period) {
  // ... (copy from index.html)
}

// Known reference: RSI(14) for a standard dataset
const testCloses = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10,
  45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
  46.03, 46.41, 46.22, 45.64];
const rsi = calcRSI(testCloses, 14);
console.assert(Math.abs(rsi[14] - 70.46) < 0.1,
  `RSI[14] expected ~70.46, got ${rsi[14]}`);
console.assert(Math.abs(rsi[19] - 58.18) < 0.1,
  `RSI[19] expected ~58.18, got ${rsi[19]}`);

// Test esc() XSS prevention
function esc(s) {
  // ... (copy from index.html)
}
console.assert(esc('<script>alert(1)</script>') ===
  '&lt;script&gt;alert(1)&lt;/script&gt;', 'XSS not escaped');
console.assert(esc('"onmouseover="alert(1)"') ===
  '&quot;onmouseover=&quot;alert(1)&quot;', 'Attribute injection not escaped');

console.log('All tests passed');
```

**Test priority by risk**:
1. `calcRSI()` - Incorrect values produce wrong trade signals
2. `esc()` - Incomplete escaping enables XSS
3. `_mapBinanceBar()` / `_mapYahooBar()` - Wrong field mapping corrupts charts
4. `aggregate4hBars()` - Incorrect bucket boundaries misalign timeframes
5. Backtest P&L calculations - Financial accuracy

### Priority 5: Git Hooks for Quality Gates (Medium Complexity)

Create `.claude/settings.json` with hooks:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "description": "Block git push with --no-verify",
        "command": "if echo \"$TOOL_INPUT\" | grep -q '\\-\\-no-verify'; then echo 'BLOCKED: Do not skip git hooks' >&2; exit 1; fi"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "description": "Warn about large file edits",
        "command": "LINES=$(wc -l < index.html 2>/dev/null || echo 0); if [ \"$LINES\" -gt 4500 ]; then echo 'WARNING: index.html exceeds 4500 lines. Consider modularization.' >&2; fi"
      }
    ]
  }
}
```

### Priority 6: Conventional Commit Enforcement (Low Complexity)

Adopt ECC's commit style immediately:
- `feat(chart):` - New chart features
- `fix(ws):` - WebSocket fixes
- `fix(xss):` - Security fixes
- `perf(volume):` - Performance optimizations
- `refactor(indicators):` - Code restructuring
- `docs:` - Documentation updates
- `test:` - Test additions

### Priority 7: Modular Architecture Plan (High Complexity, Long-term)

Following ECC's file organization guidance (200-400 lines per file), plan the
eventual decomposition of `index.html`:

```
src/
  index.html           # Shell: <head>, <body> structure, <script> imports
  css/
    theme.css          # Dark theme, color variables
    layout.css         # Grid, panels, responsive
    chart.css          # Canvas overlays, tooltips
    components.css     # Dropdowns, buttons, tabs
  js/
    state.js           # Global state object, defaults, persistence
    indicators.js      # RSI, EMA, SMA, VWAP, CVD, MCDX (~300 lines)
    chart-engine.js    # Canvas rendering, viewport, pan/zoom (~400 lines)
    data-binance.js    # Binance REST + WebSocket (~200 lines)
    data-yahoo.js      # Yahoo Finance REST polling (~200 lines)
    bar-mapping.js     # Shared bar mappers, aggregation (~100 lines)
    backtest.js        # Backtest engine (~300 lines)
    portfolio.js       # Manual trades, P&L tracking (~200 lines)
    ui-controls.js     # Tabs, dropdowns, settings panel (~300 lines)
    alerts.js          # Price alerts, notifications (~100 lines)
    scanner.js         # MTF scanner, strategy evaluation (~200 lines)
    utils.js           # esc(), formatting, helpers (~100 lines)
```

**Prerequisite**: Establish a build step (even a simple concatenation script)
before splitting files, since the project currently deploys as a single HTML
file.

---

## Priority Ranking

| # | Element | Impact | Complexity | Risk | Priority |
|---|---------|--------|------------|------|----------|
| 1 | CLAUDE.md | High | Low | None | **Immediate** |
| 2 | .gitignore | Medium | Trivial | None | **Immediate** |
| 3 | Security rules | High | Low | None | **This week** |
| 4 | Basic testing | High | Medium | Low | **This week** |
| 5 | Git hooks | Medium | Medium | Low | **Next sprint** |
| 6 | Conventional commits | Medium | Low | None | **Immediate** |
| 7 | Code review patterns | Medium | Low | None | **Ongoing** |
| 8 | MCP configurations | Medium | Medium | Low | **Next sprint** |
| 9 | Context injection | Low | Low | None | **When needed** |
| 10 | Modular architecture | Very High | Very High | Medium | **Long-term** |

### Quick Wins (< 1 hour total)
- Create CLAUDE.md (Priority 1)
- Create .gitignore (Priority 2)
- Adopt conventional commits (Priority 6)

### Short-term (1-2 days)
- Security rules document (Priority 3)
- Basic indicator test suite (Priority 4)
- Claude Code hooks setup (Priority 5)

### Long-term (weeks)
- Full modular architecture decomposition (Priority 7)
- MCP server integration (Priority 8)
- Automated CI/CD pipeline

---

*Analysis generated from [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)
applied to [andeer89-eng/Order-flow-volume](https://github.com/andeer89-eng/Order-flow-volume)*
