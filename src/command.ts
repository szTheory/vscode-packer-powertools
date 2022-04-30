import * as vscode from "vscode";

export async function init(): Promise<void> {
  const terminal = getTerminal();
  terminal.sendText("packer init .");
  terminal.show();
}

export async function build(): Promise<void> {
  // get active text editor
  const activeTextEditor = vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    vscode.window.showWarningMessage(
      "You have to open a Packer template file to build it"
    );
    return;
  }

  // get terminal
  const terminal = getTerminal();

  // run command
  const path = activeTextEditor.document.fileName;
  terminal.sendText(`packer build ${path}`);

  // show terminal to see output
  terminal.show();
}

function getTerminal(): vscode.Terminal {
  return vscode.window.activeTerminal || vscode.window.createTerminal();
}
