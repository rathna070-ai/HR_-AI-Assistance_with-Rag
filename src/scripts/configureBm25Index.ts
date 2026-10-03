// Retrieval Phase 5: configures the Atlas Search (BM25) index on resumes for
// the fields BM25 searches. The current definition is saved to backups/ first.
//
//   npm run search:bm25-index
import "dotenv/config";
import fs from "fs";
import path from "path";
import { Document } from "mongodb";
import { closeDb, getDb } from "../config/db";
import { BM25_INDEX_NAME } from "../modules/retrieval/repositories/ResumeRepository";

const POLL_MS = 5_000;
const TIMEOUT_MS = 5 * 60_000;
const text = { type: "string", analyzer: "lucene.standard" };

export const BM25_INDEX_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      rawText: text,
      skills: text,
      jobTitles: text,
      experienceSummary: text,
      role: text,
      company: text,
      // Number, so filters.minYearsExperience can use a range filter.
      totalExperience: { type: "number" },
    },
  },
};

const main = async () => {
  const resumes = (await getDb()).collection("resumes");
  const findIndex = async () => ((await resumes.listSearchIndexes(BM25_INDEX_NAME).toArray()) as Document[])[0];

  const current = await findIndex();
  if (current) {
    const backupDir = path.resolve(process.cwd(), "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `${BM25_INDEX_NAME}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(current.latestDefinition, null, 2) + "\n");
    console.log(`Saved the current definition to ${backupFile}`);
    await resumes.updateSearchIndex(BM25_INDEX_NAME, BM25_INDEX_DEFINITION);
    console.log(`Updating index "${BM25_INDEX_NAME}"...`);
  } else {
    await resumes.createSearchIndex({ name: BM25_INDEX_NAME, type: "search", definition: BM25_INDEX_DEFINITION });
    console.log(`Creating index "${BM25_INDEX_NAME}"...`);
  }

  // Ready once Atlas serves the new definition.
  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const index = await findIndex();
    const applied = index?.latestDefinition?.mappings?.fields?.rawText !== undefined;
    console.log(`  status: ${index?.status}${applied ? "" : " (new definition not applied yet)"}`);
    if (index?.status === "FAILED") throw new Error(`Index "${BM25_INDEX_NAME}" failed to build. Check it in Atlas.`);
    if (applied && index.status === "READY" && index.queryable) break;
    if (Date.now() > deadline) throw new Error(`Index "${BM25_INDEX_NAME}" is not ready yet. Run this again later.`);
  }
  console.log(`Index "${BM25_INDEX_NAME}" is ready to query.`);
};

// Only when run as a script, so importing BM25_INDEX_DEFINITION never changes Atlas.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error((err as Error).message);
      process.exitCode = 1;
    })
    .finally(closeDb);
}
