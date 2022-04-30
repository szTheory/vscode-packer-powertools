import * as vscode from "vscode";
import { workspace, TextEdit } from "vscode";
import path = require("path");
import child_process = require("child_process");

export function format(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<TextEdit[]> {
  return new Promise((resolve) => {
    const workspaceRootPath = workspace.rootPath ? workspace.rootPath : "";
    const currentWorkingDirectory = path.resolve(workspaceRootPath);

    const args = ["fmt", filePath];

    const formatter = child_process.spawn("packer", args, {
      cwd: currentWorkingDirectory,
    });

    formatter.on("error", (err) => {
      outputChannel.appendLine(err.message);
    });

    formatter.on("message", (msg) => {
      outputChannel.appendLine(msg.toString());
    });

    formatter.stderr.on("data", (data) => {
      outputChannel.appendLine(data);
    });

    formatter.stdout.on("data", (data) => {
      outputChannel.appendLine(data);
    });

    resolve([]);
  });
}
