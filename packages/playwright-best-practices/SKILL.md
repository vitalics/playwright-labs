# Playwright TypeScript Best Practices - AI Agent Skill

## Overview

This skill provides comprehensive best practices for writing robust, maintainable, and performant Playwright TypeScript tests. It's designed to help AI agents generate high-quality test automation code that follows industry standards and avoids common pitfalls.

## Skill Description

The Playwright Best Practices skill enables AI agents to:

1. **Write Stable Tests**: Generate tests that use auto-waiting, web-first assertions, and proper locator strategies to eliminate flakiness
2. **Optimize Performance**: Create fast-executing tests with proper parallel execution and test isolation
3. **Ensure Maintainability**: Structure tests using Page Object Model patterns and logical test organization
4. **Follow Best Practices**: Apply proven patterns for locators, assertions, fixtures, and debugging

## Key Capabilities

### 1. Test Stability & Reliability
- Leverage Playwright's auto-waiting instead of manual waits
- Use web-first assertions that automatically retry
- Implement proper test isolation for parallel execution
- Handle dynamic content and asynchronous operations correctly

### 2. Locator Strategies
- Prefer role-based locators (`getByRole`) over CSS/XPath
- Use semantic locators that survive UI refactoring
- Implement accessibility-first approaches
- Create resilient selectors that are human-readable

### 3. Assertions & Waiting
- Use web-first assertions with automatic retries
- Avoid race conditions with proper waiting strategies
- Implement negative assertions correctly
- Handle timeouts and custom wait conditions

### 4. Test Organization
- Structure tests with `test.describe` blocks
- Implement Page Object Model for complex applications
- Use fixtures for reusable test setup
- Create maintainable test hierarchies

### 5. Performance Optimization
- Enable safe parallel test execution
- Implement proper test isolation
- Optimize test data management
- Reduce unnecessary waits and delays

## How to Use This Skill

### For AI Agents

When generating Playwright tests, agents should:

1. **Prioritize Impact**: Start with CRITICAL and HIGH impact rules
2. **Follow the Priority Order**:
   - Use auto-waiting and web-first assertions (CRITICAL)
   - Ensure test isolation for parallel execution (CRITICAL)
   - Prefer role-based locators (HIGH)
   - Use proper test organization (MEDIUM)
   - Apply advanced patterns as needed (LOW)

3. **Reference Examples**: Use the incorrect/correct examples as templates
4. **Maintain Context**: Consider the full test context, not just individual rules

### For Developers

1. **Review the AGENTS.md**: The compiled guide contains all rules with examples
2. **Use as a Checklist**: Validate existing tests against the rules
3. **Reference in Code Reviews**: Link to specific rule IDs in PR comments
4. **Extend with Custom Rules**: Add project-specific rules following the template

## Rule Structure

Each rule includes:
- **Title**: Clear, actionable description
- **Impact Level**: CRITICAL, HIGH, MEDIUM-HIGH, MEDIUM, LOW-MEDIUM, LOW
- **Tags**: Searchable keywords
- **Incorrect Example**: Anti-pattern to avoid
- **Correct Example**: Recommended approach
- **Explanation**: Why the correct approach is better
- **Reference**: Link to official documentation

## Rule Categories

### 1. Test Stability & Reliability (CRITICAL)
The foundation of reliable test automation. Rules that eliminate flakiness and race conditions.

**Key Rules:**
- Use auto-waiting instead of manual waits
- Implement proper test isolation
- Handle dynamic content correctly
- Avoid hardcoded delays

### 2. Test Execution Speed (CRITICAL)
Fast feedback loops improve developer productivity and CI/CD efficiency.

**Key Rules:**
- Enable parallel execution
- Use efficient locator strategies
- Minimize unnecessary waits
- Optimize test data setup

### 3. Locator Best Practices (HIGH)
Resilient locators survive UI changes and ensure tests remain maintainable.

**Key Rules:**
- Prefer `getByRole()` over CSS selectors
- Use semantic locators
- Implement accessibility-first approaches
- Avoid brittle XPath expressions

### 4. Assertions & Waiting (HIGH)
Proper assertions ensure tests validate the right behavior without flakiness.

**Key Rules:**
- Use web-first assertions with auto-retry
- Implement proper waiting strategies
- Handle negative cases correctly
- Use soft assertions for multiple checks

### 5. Parallel Execution (MEDIUM-HIGH)
Safe parallel execution dramatically reduces test suite runtime.

**Key Rules:**
- Ensure complete test isolation
- Avoid shared state between tests
- Use unique test data
- Handle resource conflicts

### 6. Fixtures & Test Organization (MEDIUM)
Well-structured tests improve maintainability and code reusability.

**Key Rules:**
- Use `test.describe` for logical grouping
- Implement Page Object Model
- Create reusable fixtures
- Structure test hierarchies

### 7. Debugging & Maintenance (MEDIUM)
Effective debugging practices reduce time spent investigating failures.

**Key Rules:**
- Use trace viewer for debugging
- Implement proper error messages
- Add screenshots on failure
- Use test.step for clarity

### 8. Advanced Patterns (LOW)
Specialized patterns for specific use cases.

**Key Rules:**
- Implement visual regression testing
- Use API mocking and interception
- Create custom matchers
- Handle authentication patterns

## Integration with AI Systems

### LLM Prompts

Example prompts for using this skill:

```
"Generate a Playwright test following best practices for a login form"
"Refactor this test to use role-based locators and web-first assertions"
"Review this Playwright test and suggest improvements based on best practices"
```

### Test Case Evaluation

The `test-cases.json` file contains extracted examples for:
- Training LLMs on correct patterns
- Evaluating code generation quality
- Creating benchmark datasets
- Automated code review

## Validation

Run validation to ensure all rules are properly structured:

```bash
pnpm validate
```

This checks:
- Frontmatter completeness
- Required sections (Incorrect/Correct examples)
- Code block presence
- Reference links
- Filename conventions

## Building

Generate the compiled AGENTS.md file:

```bash
pnpm build
```

This creates:
- `AGENTS.md` - Complete guide with table of contents
- Sorted rules by section and title
- Auto-generated rule IDs
- Statistics and metadata

## Extending the Skill

To add new rules:

1. Copy `rules/_template.md`
2. Use the correct prefix for your section
3. Fill in all required fields
4. Include clear incorrect/correct examples
5. Add explanatory text
6. Run `pnpm build` to regenerate

## Best Practices for AI Agents

When applying this skill, AI agents should:

1. **Start with Stability**: Always prioritize test stability rules first
2. **Consider Context**: Apply rules appropriate to the test complexity
3. **Explain Changes**: When refactoring, explain which rules are being applied
4. **Validate Output**: Ensure generated code compiles and follows TypeScript best practices
5. **Handle Trade-offs**: Explain when and why to deviate from guidelines

## Impact Levels Guide

- **CRITICAL**: Must follow - prevents test failures and instability
- **HIGH**: Should follow - significantly improves test quality
- **MEDIUM-HIGH**: Recommended - notable improvements to maintainability
- **MEDIUM**: Good practice - helps with long-term maintenance
- **LOW-MEDIUM**: Optional - incremental improvements
- **LOW**: Advanced - for specific use cases

## Common Patterns

### Test Structure Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup for all tests in this describe block
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/page');
    
    // Act
    await page.getByRole('button', { name: 'Submit' }).click();
    
    // Assert
    await expect(page.locator('.result')).toHaveText('Success');
  });
});
```

### Page Object Template

```typescript
import { Page, Locator } from '@playwright/test';

export class PageName {
  readonly page: Page;
  readonly element: Locator;

  constructor(page: Page) {
    this.page = page;
    this.element = page.getByRole('button', { name: 'Click me' });
  }

  async performAction() {
    await this.element.click();
  }
}
```

## References

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-test)

## Maintenance

This skill is maintained as a living document. Rules are added, updated, and deprecated based on:
- Playwright framework updates
- Community feedback
- Real-world testing experience
- Industry best practices evolution

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintained By**: Playwright Labs