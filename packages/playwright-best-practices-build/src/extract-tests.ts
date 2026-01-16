#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface TestCase {
  ruleId: string;
  ruleTitle: string;
  section: string;
  impact: string;
  tags: string[];
  incorrectExample: string;
  correctExample: string;
  explanation: string;
}

interface RuleFrontmatter {
  title: string;
  impact: string;
  impactDescription?: string;
  tags?: string;
}

function parseFrontmatter(content: string): { frontmatter: RuleFrontmatter; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid frontmatter format');
  }

  const [, frontmatterStr, body] = match;
  const frontmatter: Partial<RuleFrontmatter> = {};

  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      frontmatter[key.trim() as keyof RuleFrontmatter] = value;
    }
  });

  return {
    frontmatter: frontmatter as RuleFrontmatter,
    body: body.trim()
  };
}

function extractCodeBlocks(content: string): string[] {
  const codeBlockRegex = /```typescript\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push(match[1].trim());
  }

  return blocks;
}

function extractExplanation(content: string): string {
  // Extract text between the code examples and the Reference section
  const explanationRegex = /```\n\n([\s\S]*?)\n(?:Reference:|$)/;
  const match = content.match(explanationRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Try to extract from the beginning before "Incorrect" section
  const introRegex = /\*\*Impact:.*?\n\n([\s\S]*?)\n\*\*Incorrect/;
  const introMatch = content.match(introRegex);
  
  if (introMatch && introMatch[1]) {
    return introMatch[1].trim();
  }
  
  return '';
}

function extractTestCases() {
  const rulesDir = join(process.cwd(), 'rules');
  const outputPath = join(process.cwd(), 'test-cases.json');
  
  console.log('📚 Extracting test cases from rule files...\n');
  
  const ruleFiles = readdirSync(rulesDir)
    .filter(file => file.endsWith('.md') && !file.startsWith('_'))
    .sort();
  
  const testCases: TestCase[] = [];
  let skipped = 0;
  
  for (const filename of ruleFiles) {
    const filePath = join(rulesDir, filename);
    const content = readFileSync(filePath, 'utf-8');
    
    try {
      const { frontmatter, body } = parseFrontmatter(content);
      const codeBlocks = extractCodeBlocks(body);
      
      if (codeBlocks.length < 2) {
        console.log(`⚠️  Skipping ${filename} - insufficient code examples (${codeBlocks.length})`);
        skipped++;
        continue;
      }
      
      const prefix = filename.split('-')[0];
      const tags = frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : [];
      const explanation = extractExplanation(body);
      
      // Find incorrect (first) and correct (typically second or later) examples
      const incorrectExample = codeBlocks[0];
      const correctExample = codeBlocks[1];
      
      testCases.push({
        ruleId: filename.replace('.md', ''),
        ruleTitle: frontmatter.title,
        section: prefix,
        impact: frontmatter.impact,
        tags,
        incorrectExample,
        correctExample,
        explanation
      });
      
      console.log(`✅ ${filename}`);
      
    } catch (error) {
      console.error(`❌ Error extracting from ${filename}:`, error);
      skipped++;
    }
  }
  
  // Write test cases to JSON
  const output = {
    meta: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalTestCases: testCases.length,
      description: 'Test cases extracted from Playwright TypeScript best practices for LLM evaluation'
    },
    testCases
  };
  
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Extraction Summary:`);
  console.log(`   - Total files processed: ${ruleFiles.length}`);
  console.log(`   - Test cases extracted: ${testCases.length}`);
  console.log(`   - Files skipped: ${skipped}`);
  console.log(`\n✅ Test cases saved to test-cases.json`);
  
  // Group by section
  const bySection = testCases.reduce((acc, tc) => {
    if (!acc[tc.section]) acc[tc.section] = 0;
    acc[tc.section]++;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n📁 By section:`);
  Object.entries(bySection)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([section, count]) => {
      console.log(`   - ${section}: ${count} test cases`);
    });
  
  // Group by impact
  const byImpact = testCases.reduce((acc, tc) => {
    if (!acc[tc.impact]) acc[tc.impact] = 0;
    acc[tc.impact]++;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n⚡ By impact level:`);
  const impactOrder = ['CRITICAL', 'HIGH', 'MEDIUM-HIGH', 'MEDIUM', 'LOW-MEDIUM', 'LOW'];
  impactOrder.forEach(impact => {
    if (byImpact[impact]) {
      console.log(`   - ${impact}: ${byImpact[impact]} test cases`);
    }
  });
}

// Run extraction
try {
  extractTestCases();
} catch (error) {
  console.error('❌ Extraction failed:', error);
  process.exit(1);
}