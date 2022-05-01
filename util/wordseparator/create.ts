// This code was originally taken from the VS Code source at
// src/vs/editor/common/core/wordHelper.ts
// NOTE: We're specifically not including dashes (-) as word separators
const WORD_SEPARATORS = "`~!@#$%^&*()=+[{]}\\|;:'\",.<>/?";

/**
 * Create a word definition regular expression based on default word separators.
 * Optionally provide allowed separators that should be included in words.
 *
 * The default would look something like this (but with modifications for the Packer extension):
 * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
 */
function createWordRegExp(allowInWords: string = ""): RegExp {
  let source = "(-?\\d*\\.\\d\\w*)|([^";
  for (const sep of WORD_SEPARATORS) {
    if (allowInWords.indexOf(sep) >= 0) {
      continue;
    }
    source += "\\" + sep;
  }
  source += "\\s]+)";
  return new RegExp(source, "g");
}

const result = createWordRegExp();
const resultString = result.toString();
const output = resultString.replace(/\\/gi, "\\\\");
const outputForJson = output.replace(/\\\"/gi, '\\\\"');
// TODO: update the language-configuration json file directly instead of printing out and needing to manually copy/paste it in
console.log("Normal regex:");
console.log(resultString);
console.log("For JSON:");
console.log(outputForJson);
