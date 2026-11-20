import { styleText } from "node:util";

const printWarning = (message: string, detail?: string) => {
  console.error(
    styleText(["yellow", "bold"], `⚠ ${message}`, { stream: process.stderr }),
  );
  if (detail) {
    console.error(styleText("dim", `  ${detail}`, { stream: process.stderr }));
  }
};

export default printWarning;
