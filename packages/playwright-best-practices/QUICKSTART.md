# Playwright Best Practices - Quick Start Guide

Get started with the Playwright TypeScript Best Practices package in minutes.

## Installation

```bash
cd playwright-labs/packages/playwright-best-practices
pnpm install
```

## Generate the Guide

Build the complete AGENTS.md guide from individual rules:

```bash
pnpm build
```

This creates:
- `AGENTS.md` - Complete best practices guide with all rules
- Organized by sections with auto-generated IDs
- Table of contents and cross-references

## Validate Rules

Check that all rule files are properly formatted:

```bash
pnpm validate
```

This validates:
- ✅ Frontmatter completeness (title, impact, tags)
- ✅ Required code examples (incorrect/correct)
- ✅ Filename conventions and prefixes
- ✅ Reference links

## Extract Test Cases

Generate test cases for LLM training and evaluation:

```bash
pnpm extract-tests
```

Creates `test-cases.json` with:
- Incorrect code examples
- Correct code examples
- Explanations and context
- Categorized by section and impact

## Using the Guide

### For Developers

1. **Read AGENTS.md**: Complete guide with all best practices
2. **Start with CRITICAL rules**: Focus on test stability and speed
3. **Use as checklist**: Review your tests against the rules
4. **Reference in PRs**: Link to specific rule IDs (e.g., "See rule 1.1")

### For AI Agents

The guide is optimized for LLM consumption:

```
Prompt: "Generate a Playwright test for a login form following best practices"
Context: Include relevant sections from AGENTS.md
Output: Test using auto-waiting, role-based locators, web-first assertions
```

Example prompts:
- "Refactor this test to use role-based locators (rule 3.1)"
- "Add test isolation for parallel execution (rule 5.1)"
- "Convert to Page Object Model pattern (rule 6.2)"

## Rule Structure

Each rule file (`rules/*.md`) contains:

```markdown
---
title: Rule Title
impact: CRITICAL|HIGH|MEDIUM|LOW
impactDescription: Optional specific impact description
tags: tag1, tag2, tag3
---

## Rule Title

Brief explanation...

**Incorrect:**

```typescript
// Bad code example
```

**Correct:**

```typescript
// Good code example
```

Explanation of why correct approach is better...

Reference: [Link](https://playwright.dev)
```

## Rule Categories (Prefixes)

Use these prefixes when creating new rules:

| Prefix | Section | Impact | Focus |
|--------|---------|--------|-------|
| `stable-` | Test Stability & Reliability | CRITICAL | Eliminate flakiness |
| `speed-` | Test Execution Speed | CRITICAL | Fast feedback loops |
| `locator-` | Locator Best Practices | HIGH | Resilient selectors |
| `assertion-` | Assertions & Waiting | HIGH | Proper validation |
| `parallel-` | Parallel Execution | MEDIUM-HIGH | Safe parallelization |
| `fixture-` | Fixtures & Organization | MEDIUM | Maintainable structure |
| `debug-` | Debugging & Maintenance | MEDIUM | Easy troubleshooting |
| `advanced-` | Advanced Patterns | LOW | Specialized techniques |

## Creating a New Rule

1. **Copy the template:**
```bash
cp rules/_template.md rules/stable-my-new-rule.md
```

2. **Edit the frontmatter:**
```yaml
---
title: My New Rule Title
impact: HIGH
impactDescription: Reduces test failures by 40%
tags: stability, locators, best-practice
---
```

3. **Add incorrect example:**
```typescript
**Incorrect (why it's wrong):**

```typescript
// Bad code that demonstrates the problem
```

4. **Add correct example:**
```typescript
**Correct (why it's right):**

```typescript
// Good code that shows the solution
```

5. **Add explanation and reference:**
```markdown
Explanation of benefits, when to use, and considerations...

Reference: [Playwright Docs](https://playwright.dev/docs/...)
```

6. **Rebuild and validate:**
```bash
pnpm build
pnpm validate
```

## Example Workflow

### Adding a New Stability Rule

```bash
# 1. Create rule file
cp rules/_template.md rules/stable-avoid-sleep.md

# 2. Edit the file with your content

# 3. Validate
pnpm validate

# 4. Build
pnpm build

# 5. Check the output
cat AGENTS.md | grep "Avoid Sleep"
```

### Using in Your Tests

```typescript
// Before: Flaky test with manual waits
test('old way', async ({ page }) => {
  await page.goto('https://example.com');
  await page.waitForTimeout(3000); // ❌ Bad (Rule 1.1)
  await page.click('button');
});

// After: Stable test with auto-waiting
test('new way', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button'); // ✅ Good - auto-waits
});
```

## Directory Structure

```
playwright-best-practices/
├── README.md              # Package overview
├── QUICKSTART.md          # This file
├── SKILL.md              # AI agent integration guide
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── metadata.json         # Document metadata
├── AGENTS.md             # Generated: Complete guide
├── test-cases.json       # Generated: Test cases for LLM
├── rules/
│   ├── _sections.md      # Section definitions
│   ├── _template.md      # Rule template
│   ├── stable-*.md       # Stability rules (Section 1)
│   ├── speed-*.md        # Performance rules (Section 2)
│   ├── locator-*.md      # Locator rules (Section 3)
│   ├── assertion-*.md    # Assertion rules (Section 4)
│   ├── parallel-*.md     # Parallel rules (Section 5)
│   ├── fixture-*.md      # Organization rules (Section 6)
│   ├── debug-*.md        # Debugging rules (Section 7)
│   └── advanced-*.md     # Advanced rules (Section 8)
└── src/
    ├── build.ts          # Build script
    ├── validate.ts       # Validation script
    └── extract-tests.ts  # Test extraction script
```

## Impact Levels

Choose the appropriate impact level for your rule:

- **CRITICAL**: Must follow - prevents test failures/instability
  - Example: Auto-waiting, test isolation
  
- **HIGH**: Should follow - significant quality improvement
  - Example: Role-based locators, web-first assertions
  
- **MEDIUM-HIGH**: Recommended - notable maintainability gains
  - Example: Parallel execution optimization
  
- **MEDIUM**: Good practice - helps long-term maintenance
  - Example: Test organization, page objects
  
- **LOW-MEDIUM**: Optional - incremental improvements
  - Example: Specific debugging techniques
  
- **LOW**: Advanced - specialized use cases
  - Example: API mocking, visual regression

## Key Rules Reference

### Top 5 Critical Rules

1. **Use Auto-Waiting** (`stable-auto-waiting.md`)
   - Eliminates 70-90% of flaky tests
   - Never use `waitForTimeout()`

2. **Test Isolation** (`parallel-test-isolation.md`)
   - Enables safe parallel execution
   - Use unique test data per test

3. **Role-Based Locators** (`locator-role-based.md`)
   - Reduces brittleness by 60-80%
   - Prefer `getByRole()` over CSS

4. **Web-First Assertions** (`assertion-web-first.md`)
   - Auto-retry until condition met
   - Use `expect(locator).toHaveText()`

5. **Test Organization** (`fixture-describe-blocks.md`)
   - Group related tests logically
   - Use `test.describe()` blocks

## Common Patterns

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should perform action', async ({ page }) => {
    // Navigate
    await page.goto('/page');
    
    // Interact with role-based locators
    await page.getByRole('button', { name: 'Submit' }).click();
    
    // Assert with web-first assertions
    await expect(page.locator('.result')).toHaveText('Success');
  });
});
```

### With Page Objects
```typescript
import { LoginPage } from './pages/login.page';

test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await loginPage.expectSuccess();
});
```

### With Fixtures
```typescript
import { test as base } from '@playwright/test';

const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Setup: login
    await page.goto('/login');
    // ... authentication ...
    await use(page);
    // Teardown: automatic
  }
});

test('use fixture', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
});
```

## Troubleshooting

### Validation Fails

```bash
❌ stable-my-rule.md
   - Missing required field: tags
```

**Solution**: Add tags to frontmatter:
```yaml
tags: stability, best-practice
```

### Build Fails

```bash
❌ Error parsing stable-my-rule.md: Invalid frontmatter format
```

**Solution**: Ensure frontmatter has `---` delimiters:
```yaml
---
title: My Rule
impact: HIGH
tags: example
---
```

### Missing Code Examples

```bash
⚠️ Skipping stable-my-rule.md - insufficient code examples (1)
```

**Solution**: Add both incorrect and correct examples:
```typescript
**Incorrect:**
```typescript
// bad code
```

**Correct:**
```typescript
// good code
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-test)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Contributing

1. Fork the repository
2. Create a rule following the template
3. Run `pnpm validate` and `pnpm build`
4. Submit a pull request with:
   - Clear rule description
   - Realistic examples
   - Impact justification
   - Reference links

## Next Steps

1. ✅ Run `pnpm build` to generate AGENTS.md
2. ✅ Read AGENTS.md to learn the best practices
3. ✅ Apply rules to your existing tests
4. ✅ Create project-specific rules as needed
5. ✅ Share improvements back to the community

---

**Questions?** Check out SKILL.md for AI agent integration details or README.md for package overview.