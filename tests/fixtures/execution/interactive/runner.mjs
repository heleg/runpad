import { createInterface } from "node:readline/promises";
const mode = process.argv[2];
console.log(JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));
if (mode === "fail") process.exitCode = 7;
if (mode === "input") {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  console.log(await input.question("Type a value: "));
  input.close();
}
if (mode === "wait") {
  console.log("Waiting for Ctrl+C");
  const timer = setInterval(() => console.log("tick"), 1000);
  process.on("SIGINT", () => { clearInterval(timer); process.exitCode = 130; });
}
