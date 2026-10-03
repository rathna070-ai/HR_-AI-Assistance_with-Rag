// Batch resume ingestion from the command line.
//
//   npm run ingest:batch -- --size 5            one batch of 5
//   npm run ingest:batch -- --size 10 --runs 3  three batches of 10
//   npm run ingest:batch -- --size 10 --all     batches until nothing is pending
//   npm run ingest:batch -- --retry-failed      include previously failed files
//   npm run ingest:batch -- --status            only print the status
import "dotenv/config";
import { closeDb } from "../config/db";
import { BatchReport, batchIngestionService, resolveBatchSize } from "../services/BatchIngestionService";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const printReport = (report: BatchReport, run: number) => {
  console.log(
    `\n[run ${run}] ${report.batchId} size=${report.batchSize} selected=${report.selected} ` +
      `ingested=${report.ingested} duplicate=${report.duplicate} failed=${report.failed} ` +
      `remaining=${report.remainingPending} (${report.durationMs} ms)`,
  );
  for (const f of report.files) {
    console.log(`  ${f.status.padEnd(9)} ${f.sourceFile}${f.reason ? `  -> ${f.reason}` : ""}`);
  }
};

const main = async () => {
  if (!flag("--status")) {
    const batchSize = resolveBatchSize(option("--size"));
    // Each file that failed before this command started is retried once.
    const retryFailedBefore = flag("--retry-failed") ? new Date() : undefined;
    const maxRuns = flag("--all") ? Infinity : Math.max(1, Number(option("--runs") ?? 1));

    for (let run = 1; run <= maxRuns; run++) {
      const report = await batchIngestionService.runBatch({ batchSize, retryFailedBefore });
      printReport(report, run);
      if (report.selected === 0 || report.remainingPending === 0) break;
    }
  }

  const status = await batchIngestionService.getStatus();
  const { failures, unsupportedFiles, ...summary } = status;
  console.log("\nStatus:", JSON.stringify(summary, null, 2));
  if (unsupportedFiles.length) console.log(`Unsupported (not PDF): ${unsupportedFiles.join(", ")}`);
  if (failures.length) {
    console.log("Failed files:");
    for (const f of failures) console.log(`  ${f.sourceFile}  -> ${f.reason}`);
  }
};

main()
  .catch((err) => {
    console.error((err as Error).message, (err as Error).cause ?? "");
    process.exitCode = 1;
  })
  .finally(closeDb);
