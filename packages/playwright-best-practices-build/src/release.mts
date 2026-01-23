#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

/**
 * Metadata structure for the best practices guide
 */
interface Metadata {
  version: string;
  organization: string;
  date: string;
  abstract: string;
  references: string[];
}

/**
 * Semantic version parts
 */
interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Version increment type
 */
type VersionType = "major" | "minor" | "patch";

/**
 * Parse semantic version string into components
 * @param version - Version string in format "X.Y.Z"
 * @returns Parsed version object
 */
function parseVersion(version: string): SemanticVersion {
  const parts = version.split(".").map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(
      `Invalid version format: ${version}. Expected format: X.Y.Z`,
    );
  }

  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
  };
}

/**
 * Convert semantic version object to string
 * @param version - Semantic version object
 * @returns Version string in format "X.Y.Z"
 */
function versionToString(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Increment version based on type
 * @param version - Current semantic version
 * @param type - Type of increment (major, minor, patch)
 * @returns New incremented version
 */
function incrementVersion(
  version: SemanticVersion,
  type: VersionType,
): SemanticVersion {
  const newVersion = { ...version };

  switch (type) {
    case "major":
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case "minor":
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case "patch":
      newVersion.patch += 1;
      break;
    default:
      throw new Error(
        `Invalid version type: ${type}. Expected: major, minor, or patch`,
      );
  }

  return newVersion;
}

/**
 * Get current date in "Month YYYY" format
 * @returns Formatted date string
 */
function getCurrentDate(): string {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  return `${month} ${year}`;
}

/**
 * Update metadata.json file with new version
 * @param metadataPath - Path to metadata.json file
 * @param versionType - Type of version increment
 * @param updateDate - Whether to update the date field
 */
function updateMetadata(
  metadataPath: string,
  versionType: VersionType = "patch",
  updateDate: boolean = true,
): void {
  // Read metadata file
  const metadataContent = readFileSync(metadataPath, "utf-8");
  const metadata: Metadata = JSON.parse(metadataContent);

  // Parse current version
  const currentVersion = parseVersion(metadata.version);
  console.log(`Current version: ${versionToString(currentVersion)}`);

  // Increment version
  const newVersion = incrementVersion(currentVersion, versionType);
  const newVersionString = versionToString(newVersion);
  console.log(`New version: ${newVersionString}`);

  // Update metadata
  metadata.version = newVersionString;

  if (updateDate) {
    const newDate = getCurrentDate();
    metadata.date = newDate;
    console.log(`Updated date: ${newDate}`);
  }

  // Write updated metadata back to file
  const updatedContent = JSON.stringify(metadata, null, 2);
  writeFileSync(metadataPath, updatedContent + "\n", "utf-8");

  console.log(`✅ Successfully updated ${metadataPath}`);
}

/**
 * Main execution function
 */
function main(): void {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let versionType: VersionType = "patch";
  let updateDate = true;
  let metadataPath = resolve(process.cwd(), "metadata.json");

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--major":
      case "-M":
        versionType = "major";
        break;
      case "--minor":
      case "-m":
        versionType = "minor";
        break;
      case "--patch":
      case "-p":
        versionType = "patch";
        break;
      case "--no-date":
        updateDate = false;
        break;
      case "--file":
      case "-f":
        if (i + 1 < args.length) {
          metadataPath = resolve(process.cwd(), args[i + 1]);
          i++;
        } else {
          console.error("Error: --file requires a path argument");
          process.exit(1);
        }
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  try {
    updateMetadata(metadataPath, versionType, updateDate);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unexpected error occurred");
    }
    process.exit(1);
  }
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Usage: node increment-version.js [options]

Options:
  -M, --major        Increment major version (X.0.0)
  -m, --minor        Increment minor version (x.Y.0)
  -p, --patch        Increment patch version (x.y.Z) [default]
  --no-date          Don't update the date field
  -f, --file <path>  Path to metadata.json file [default: ./metadata.json]
  -h, --help         Show this help message

Examples:
  node increment-version.js                    # Increment patch version (1.0.0 → 1.0.1)
  node increment-version.js --minor            # Increment minor version (1.0.0 → 1.1.0)
  node increment-version.js --major            # Increment major version (1.0.0 → 2.0.0)
  node increment-version.js --patch --no-date  # Increment patch without updating date
  node increment-version.js -f ./path/to/metadata.json  # Use custom file path

Semantic Versioning:
  - MAJOR: Incompatible API changes or major feature additions
  - MINOR: Backward-compatible functionality additions
  - PATCH: Backward-compatible bug fixes or minor improvements
  `);
}

// Export functions for testing
export {
  parseVersion,
  versionToString,
  incrementVersion,
  getCurrentDate,
  updateMetadata,
  type Metadata,
  type SemanticVersion,
  type VersionType,
};

// Run main if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
