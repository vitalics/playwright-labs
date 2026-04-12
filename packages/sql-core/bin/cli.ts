#!/usr/bin/env node
/**
 * @playwright-labs/sql-core — CLI entry point
 *
 * Usage:
 *   @playwright-labs/sql-core pull --adapter sqlite --url ./dev.db
 *   @playwright-labs/sql-core pull --adapter pg     --url postgresql://user:pass@localhost/mydb
 *   @playwright-labs/sql-core pull --adapter mysql  --url mysql://user:pass@localhost/mydb [--out ./tests/db-types.ts]
 */

import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  generateTypes,
  introspectSQLite,
  introspectPg,
  introspectMySQL,
  sqliteToTS,
  pgToTS,
  mysqlToTS,
} from "./pull-lib.js";

const program = new Command();

program
  .name("@playwright-labs/sql-core")
  .description("@playwright-labs/sql-core — CLI tools for SQL schema management")
  .version("0.0.1");

program
  .command("pull")
  .description("Introspect a live database schema and emit TypeScript row-type interfaces")
  .requiredOption("-a, --adapter <adapter>", "Database adapter: sqlite | pg | mysql")
  .requiredOption("-u, --url <url>", "Connection URL or file path")
  .option("-o, --out <file>", "Write output to a file instead of stdout")
  .action(async (opts: { adapter: string; url: string; out?: string }) => {
    const { adapter: adapterName, url, out: outPath } = opts;

    if (!["sqlite", "pg", "mysql"].includes(adapterName)) {
      program.error(`Unknown adapter "${adapterName}". Supported values: sqlite, pg, mysql`);
    }

    let schemas: Awaited<ReturnType<typeof introspectSQLite>>;
    let toTS: (type: string, nullable: boolean) => string;
    let closeClient: () => Promise<void>;

    if (adapterName === "sqlite") {
      const { sqliteAdapter } = await import("@playwright-labs/sql-core/sqlite");
      const client = await sqliteAdapter(url).create();
      schemas = await introspectSQLite(client);
      toTS = sqliteToTS;
      closeClient = () => client.close();
    } else if (adapterName === "pg") {
      const { pgAdapter } = await import("@playwright-labs/sql-core/pg");
      const client = await pgAdapter(url).create();
      schemas = await introspectPg(client);
      toTS = pgToTS;
      closeClient = () => client.close();
    } else {
      const { mysqlAdapter } = await import("@playwright-labs/sql-core/mysql");
      const client = await mysqlAdapter(url).create();
      schemas = await introspectMySQL(client);
      toTS = mysqlToTS;
      closeClient = () => client.close();
    }

    await closeClient();

    const output = generateTypes(schemas, toTS, adapterName, url);

    if (outPath) {
      await writeFile(resolve(process.cwd(), outPath), output, "utf8");
      process.stderr.write(`✔ types written to ${outPath}\n`);
    } else {
      process.stdout.write(output);
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`Error: ${(err as Error).message}\n`);
  process.exit(1);
});
