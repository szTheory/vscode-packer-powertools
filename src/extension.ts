import * as vscode from "vscode";
import { TextDocument, TextEdit } from "vscode";
import { build, init, inspect } from "./command";
import { hoverProvider } from "./docs";
import { format } from "./format";
import { activateValidation } from "./validate";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // A channel to write debug messages for this extension
  const outputChannel = vscode.window.createOutputChannel("Packer Powertools");

  // Formatting
  vscode.languages.registerDocumentFormattingEditProvider("packer", {
    provideDocumentFormattingEdits(
      document: TextDocument
    ): Thenable<TextEdit[]> {
      return format(document.fileName, outputChannel);
    },
  });

  // Validation
  const diagnosticCollection: vscode.DiagnosticCollection =
    vscode.languages.createDiagnosticCollection();
  activateValidation(
    context.subscriptions,
    diagnosticCollection,
    outputChannel
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("packer.init", async () => {
      await init();
    }),
    vscode.commands.registerCommand("packer.build", async () => {
      await build();
    }),
    vscode.commands.registerCommand("packer.inspect", async () => {
      await inspect();
    })
  );

  // Hover documentation
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(DOCUMENT_SELECTOR, hoverProvider)
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

const DOCUMENT_SELECTOR: vscode.DocumentFilter = {
  language: "packer",
  pattern: "**/*.pkr.hcl",
  scheme: "file",
};
