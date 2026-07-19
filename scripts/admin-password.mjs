import { stdin as input, stdout as output } from "node:process";

export async function readHidden(prompt) {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("An interactive terminal is required to enter the password safely");
  }

  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    let settled = false;

    function cleanup() {
      if (settled) return;
      settled = true;
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      output.write("\n");
    }

    function onData(chunk) {
      for (const character of chunk) {
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Cancelled"));
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (/^[\x20-\x7E]$/.test(character)) value += character;
      }
    }

    input.on("data", onData);
  });
}

export function assertStrongPassword(password) {
  if (
    password.length < 12 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "Password must be 12-128 chars and contain lower, upper, number and symbol",
    );
  }
}
