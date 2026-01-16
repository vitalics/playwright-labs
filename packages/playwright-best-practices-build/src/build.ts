#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface RuleFrontmatter {
  title: string;
  impact: string;
  impactDescription?: string;
  tags?: string;
}

interface Rule {
  filename: string;
  title: string;
  impact: string;
  impactDescription?: string;
  tags: string[];
  content: string;
  section: number;
}

interface Section {
  id: number;
  title: string;
  prefix: string;
  impact: string;
  description: string;
  rules: Rule[];
}

// Parse frontmatter from markdown file
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

// Parse sections from _sections.md
function parseSections(sectionsPath: string): Map<string, Section> {
  const content = readFileSync(sectionsPath, 'utf-8');
  const sections = new Map<string, Section>();

  const sectionRegex = /## (\d+)\. (.+?) \((\w+)\)\n\n\*\*Impact:\*\* (.+?)\s+\n\*\*Description:\*\* (.+?)(?=\n\n##|\n*$)/gs;

  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const [, id, title, prefix, impact, description] = match;
    sections.set(prefix, {
      id: parseInt(id),
      title,
      prefix,
      impact,
      description: description.trim(),
      rules: []
    });
  }

  return sections;
}

// Read metadata
function readMetadata(metadataPath: string): any {
  return JSON.parse(readFileSync(metadataPath, 'utf-8'));
}

// Build AGENTS.md
function build() {
  const rulesDir = join(process.cwd(), '../playwright-best-practices/rules');
  const sectionsPath = join(rulesDir, '_sections.md');
  const metadataPath = join(process.cwd(), 'metadata.json');
  const outputPath = join(process.cwd(), '../playwright-best-practices/AGENTS.md');

  console.log('📖 Reading sections...');
  const sections = parseSections(sectionsPath);

  console.log('📂 Reading rule files...');
  const ruleFiles = readdirSync(rulesDir)
    .filter(file => file.endsWith('.md') && !file.startsWith('_'))
    .sort();

  console.log(`Found ${ruleFiles.length} rule files`);

  // Parse all rules
  for (const filename of ruleFiles) {
    const filePath = join(rulesDir, filename);
    const content = readFileSync(filePath, 'utf-8');

    try {
      const { frontmatter, body } = parseFrontmatter(content);

      // Determine section from filename prefix
      const prefix = filename.split('-')[0];
      const section = sections.get(prefix);

      if (!section) {
        console.warn(`⚠️  Warning: No section found for prefix "${prefix}" in ${filename}`);
        continue;
      }

      const tags = frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : [];

      section.rules.push({
        filename,
        title: frontmatter.title,
        impact: frontmatter.impact,
        impactDescription: frontmatter.impactDescription,
        tags,
        content: body,
        section: section.id
      });
    } catch (error) {
      console.error(`❌ Error parsing ${filename}:`, error);
      process.exit(1);
    }
  }

  // Sort rules within each section by title
  for (const section of sections.values()) {
    section.rules.sort((a, b) => a.title.localeCompare(b.title));
  }

  console.log('✍️  Generating AGENTS.md...');
  const metadata = readMetadata(metadataPath);

  // Build output
  let output = `# Playwright TypeScript Best Practices\n\n`;
  output += `**Version:** ${metadata.version}  \n`;
  output += `**Organization:** ${metadata.organization}  \n`;
  output += `**Date:** ${metadata.date}\n\n`;
  output += `## Abstract\n\n${metadata.abstract}\n\n`;
  output += `---\n\n`;

  // Table of contents
  output += `## Table of Contents\n\n`;
  const sortedSections = Array.from(sections.values()).sort((a, b) => a.id - b.id);
  for (const section of sortedSections) {
    if (section.rules.length === 0) continue;
    output += `${section.id}. [${section.title}](#${section.id}-${section.title.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, '')}) (${section.impact})\n`;
    for (let i = 0; i < section.rules.length; i++) {
      const rule = section.rules[i];
      const ruleId = `${section.id}.${i + 1}`;
      const anchor = `${ruleId}-${rule.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      output += `   - ${ruleId}. [${rule.title}](#${anchor})\n`;
    }
  }
  output += `\n---\n\n`;

  // Sections and rules
  for (const section of sortedSections) {
    if (section.rules.length === 0) continue;

    output += `## ${section.id}. ${section.title}\n\n`;
    output += `**Impact:** ${section.impact}  \n`;
    output += `**Description:** ${section.description}\n\n`;

    for (let i = 0; i < section.rules.length; i++) {
      const rule = section.rules[i];
      const ruleId = `${section.id}.${i + 1}`;

      output += `### ${ruleId}. ${rule.title}\n\n`;

      if (rule.tags.length > 0) {
        output += `**Tags:** ${rule.tags.join(', ')}  \n`;
      }

      output += `**Impact:** ${rule.impact}`;
      if (rule.impactDescription) {
        output += ` (${rule.impactDescription})`;
      }
      output += `\n\n`;

      // Add the rule content (remove the title if it's duplicated)
      let ruleContent = rule.content;
      const titleRegex = new RegExp(`^## ${rule.title}\\n\\n`, 'i');
      ruleContent = ruleContent.replace(titleRegex, '');

      output += `${ruleContent}\n\n`;
      output += `---\n\n`;
    }
  }

  // References
  if (metadata.references && metadata.references.length > 0) {
    output += `## References\n\n`;
    for (const ref of metadata.references) {
      output += `- ${ref}\n`;
    }
    output += `\n`;
  }

  // Footer
  output += `---\n\n`;
  output += `*This document was automatically generated from individual rule files.*  \n`;
  output += `*Last updated: ${new Date().toISOString().split('T')[0]}*\n`;

  writeFileSync(outputPath, output, 'utf-8');

  // Statistics
  const totalRules = sortedSections.reduce((sum, s) => sum + s.rules.length, 0);
  console.log(`\n✅ Successfully generated AGENTS.md`);
  console.log(`📊 Statistics:`);
  console.log(`   - Sections: ${sortedSections.filter(s => s.rules.length > 0).length}`);
  console.log(`   - Total rules: ${totalRules}`);
  for (const section of sortedSections) {
    if (section.rules.length === 0) continue;
    console.log(`   - ${section.title}: ${section.rules.length} rules`);
  }
}

// Run build
try {
  build();
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
