import { runSeed } from "./seed/run";

runSeed().catch(error => {
  console.error("Staging seed failed:", error);
  process.exitCode = 1;
});
