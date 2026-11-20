import { styleText } from "node:util";

const printError = (message: string, detail?: string) => {
  console.error(
    styleText(["red", "bold"], `✖ ${message}`, { stream: process.stderr }),
  );
  if (detail) {
    console.error(styleText("dim", `  ${detail}`, { stream: process.stderr }));
  }
};

export default printError;
