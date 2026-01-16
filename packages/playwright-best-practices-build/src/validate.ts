#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ValidationError {
  file: string;
  error: string;
}

const VALID_IMPACTS = ['CRITICAL', 'HIGH', 'MEDIUM-HIGH', 'MEDIUM', 'LOW-MEDIUM', 'LOW'];
const VALID_PREFIXES = ['stable', 'speed', 'locator', 'assertion', 'parallel', 'fixture', 'debug', 'advanced'];

function validateFrontmatter(content: string, filename: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    errors.push({ file: filename, error: 'Missing or invalid frontmatter' });
    return errors;
  }

  const [, frontmatterStr, body] = match;
  const frontmatter: Record<string, string> = {};

  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim();
    }
  });

  // Check required fields
  if (!frontmatter.title) {
    errors.push({ file: filename, error: 'Missing required field: title' });
  }

  if (!frontmatter.impact) {
    errors.push({ file: filename, error: 'Missing required field: impact' });
  } else if (!VALID_IMPACTS.includes(frontmatter.impact)) {
    errors.push({
      file: filename,
      error: `Invalid impact level: ${frontmatter.impact}. Must be one of: ${VALID_IMPACTS.join(', ')}`
    });
  }

  if (!frontmatter.tags) {
    errors.push({ file: filename, error: 'Missing required field: tags' });
  }

  // Check prefix
  const prefix = filename.split('-')[0];
  if (!VALID_PREFIXES.includes(prefix)) {
    errors.push({
      file: filename,
      error: `Invalid filename prefix: ${prefix}. Must be one of: ${VALID_PREFIXES.join(', ')}`
    });
  }

  // Check body content
  if (!body.trim()) {
    errors.push({ file: filename, error: 'Empty rule body' });
  }

  // Check for code examples
  const codeBlockRegex = /```typescript/g;
  const codeBlocks = body.match(codeBlockRegex);
  if (!codeBlocks || codeBlocks.length < 2) {
    errors.push({
      file: filename,
      error: 'Rule should contain at least 2 TypeScript code examples (incorrect and correct)'
    });
  }

  // Check for Incorrect and Correct sections
  if (!body.includes('**Incorrect') && !body.includes('**❌')) {
    errors.push({ file: filename, error: 'Missing "Incorrect" example section' });
  }

  if (!body.includes('**Correct') && !body.includes('**✅')) {
    errors.push({ file: filename, error: 'Missing "Correct" example section' });
  }

  // Check for Reference section
  if (!body.includes('Reference:')) {
    errors.push({ file: filename, error: 'Missing Reference section' });
  }

  return errors;
}

function validate() {
  const rulesDir = join(process.cwd(), '../playwright-best-practices/rules');
  const ruleFiles = readdirSync(rulesDir)
    .filter(file => file.endsWith('.md') && !file.startsWith('_'))
    .sort();

  console.log(`🔍 Validating ${ruleFiles.length} rule files...\n`);

  const allErrors: ValidationError[] = [];

  for (const filename of ruleFiles) {
    const filePath = join(rulesDir, filename);
    const content = readFileSync(filePath, 'utf-8');

    try {
      const errors = validateFrontmatter(content, filename);
      allErrors.push(...errors);

      if (errors.length === 0) {
        console.log(`✅ ${filename}`);
      } else {
        console.log(`❌ ${filename}`);
        errors.forEach(err => console.log(`   - ${err.error}`));
      }
    } catch (error) {
      console.error(`❌ ${filename}`);
      console.error(`   - Unexpected error: ${error}`);
      allErrors.push({ file: filename, error: `Unexpected error: ${error}` });
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Validation Summary:`);
  console.log(`   - Total files: ${ruleFiles.length}`);
  console.log(`   - Files with errors: ${new Set(allErrors.map(e => e.file)).size}`);
  console.log(`   - Total errors: ${allErrors.length}`);

  if (allErrors.length > 0) {
    console.log(`\n❌ Validation failed with ${allErrors.length} error(s)`);
    process.exit(1);
  } else {
    console.log(`\n✅ All rule files are valid!`);
  }
}

// Run validation
try {
  validate();
} catch (error) {
  console.error('❌ Validation failed:', error);
  process.exit(1);
}
