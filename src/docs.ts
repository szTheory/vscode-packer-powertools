import * as vscode from "vscode";

// TODO: read this from the language-configuration json file
const WORD_REGEX_STR =
  "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\$\\%\\^\\&\\*\\(\\)\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\\\\\s\\/\\?\\s]+)";
const WORD_REGEX = new RegExp(WORD_REGEX_STR);

function provideHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Hover> {
  return new Promise((resolve, reject) => {
    // Get the word and current line
    const word = document.getText(document.getWordRangeAtPosition(position));
    const line = document.lineAt(position.line);

    console.log(position);
    console.log(word);
    console.log(line.text);
    console.log("-----");

    // Ignore words that have a space in them or are empty
    if (word.indexOf(" ") >= 0 || word === "") {
      resolve(null);
    }

    // Is it an attribute? (a line with an = symbol)
    if (line.text.indexOf("=") >= 0) {
      console.log("---- ATTRIBUTE");
      // Find where the equals sign is
      const equalsSignIndex = line.text.indexOf("=");

      // If what's being hovered over isn't on
      // the left side of the equals side, ignore
      if (position.character > equalsSignIndex) {
        console.log("IGNORING");
        resolve(null);
      }
      // Is it a block? (a line with an { symbol)
    } else if (line.text.indexOf("{") >= 0) {
      console.log("---- BLOCK");

      // Find the second quote symbol
      const firstQuoteIndex = line.text.indexOf('"');
      const secondQuoteIndex = line.text.indexOf('"', firstQuoteIndex + 1);

      // Ignore anything after the second quote symbol
      if (position.character > secondQuoteIndex) {
        console.log("IGNORING");
        resolve(null);
      }
    }

    // This is where the hover action happens
    resolve(new vscode.Hover(`${word} is a hover`));
  });
}

export const hoverProvider: vscode.HoverProvider = { provideHover };
