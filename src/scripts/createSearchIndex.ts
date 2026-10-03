// Phase 14: creates the Atlas Vector Search index on resumes.embedding.
//
//   npm run search:index
import "dotenv/config";
import { closeDb } from "../config/db";
import { resumeRepository } from "../repositories/ResumeRepository";

const POLL_MS = 5_000;
const TIMEOUT_MS = 5 * 60_000;

const main = async () => {
  const dimension = Number(process.env.EMBEDDING_DIMENSION) || 1024;
  let status = await resumeRepository.getVectorIndexStatus();

  if (status.exists) {
    console.log(`Index "${status.name}" already exists (status: ${status.status}).`);
  } else {
    await resumeRepository.createVectorIndex(dimension);
    console.log(`Creating index "${status.name}" (${dimension} dimensions, cosine)...`);
  }

  const deadline = Date.now() + TIMEOUT_MS;
  while (!status.queryable) {
    if (status.status === "FAILED") throw new Error(`Index "${status.name}" failed to build. Check it in Atlas.`);
    if (Date.now() > deadline) throw new Error(`Index "${status.name}" is still ${status.status}. Run this again later.`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    status = await resumeRepository.getVectorIndexStatus();
    console.log(`  status: ${status.status}`);
  }

  console.log(`Index "${status.name}" is ready to query.`);
};

main()
  .catch((err) => {
    console.error((err as Error).message, (err as Error).cause ?? "");
    process.exitCode = 1;
  })
  .finally(closeDb);
