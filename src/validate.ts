import * as vscode from "vscode";
import path = require("path");
import child_process = require("child_process");

let diagnosticCollection: vscode.DiagnosticCollection =
  vscode.languages.createDiagnosticCollection();

export function activateValidation(
  subscriptions: vscode.Disposable[],
  diagnosticCollection: vscode.DiagnosticCollection,
  outputChannel: vscode.OutputChannel
) {
  // Unsubscribe text documents from diagnostics on close
  vscode.workspace.onDidCloseTextDocument(
    (textDocument) => {
      diagnosticCollection.delete(textDocument.uri);
    },
    null,
    subscriptions
  );

  // Validate text documents on open and save
  vscode.workspace.onDidOpenTextDocument(validate, null, subscriptions);
  vscode.workspace.onDidSaveTextDocument(validate, null);

  function validate(textDocument: vscode.TextDocument) {
    if (textDocument.languageId !== "packer") {
      return;
    }

    const workspaceRootPath = vscode.workspace.rootPath
      ? vscode.workspace.rootPath
      : "";
    const currentWorkingDirectory = path.resolve(workspaceRootPath);

    outputChannel.appendLine(`validating: ${textDocument.fileName}`);
    const args = ["validate", textDocument.fileName, "-machine-readable"];

    const validator = child_process.spawn("packer", args, {
      cwd: currentWorkingDirectory,
    });

    validator.on("error", (err) => {
      outputChannel.appendLine("------ ERROR ------");
      outputChannel.appendLine(err.message);
    });

    validator.on("message", (msg) => {
      outputChannel.appendLine("------ MESSAGE ------");
      outputChannel.appendLine(msg.toString());
    });

    validator.stderr.on("data", (data) => {
      outputChannel.appendLine("------ DATA STDERR ------");
      outputChannel.appendLine(data);
    });

    let errors: Error[] = [];

    validator.stdout.on("data", (data) => {
      outputChannel.appendLine("------ DATA STDOUT ------");
      const stringData = data.toString();
      const [
        _outputNumber,
        _unsureWhatThisIs,
        _outputType,
        _errorType,
        errorsString,
      ] = stringData.split(",");

      errors = getErrors(errorsString);
      outputChannel.appendLine(data);
    });

    validator.stdout.on("end", () => {
      outputChannel.appendLine("------ STDOUT ENNDDDDDDD ------");
      diagnosticCollection.set(
        textDocument.uri,
        getDiagnostics(errors, textDocument)
      );
    });
  }
}

function getDiagnostics(
  errors: Error[],
  textDocument: vscode.TextDocument
): vscode.Diagnostic[] {
  let diagnostics: vscode.Diagnostic[] = [];

  for (const error of errors) {
    diagnostics.push(createDiagnostic(error, textDocument));
  }

  return diagnostics;
}

function createDiagnostic(
  error: Error,
  textDocument: vscode.TextDocument
): vscode.Diagnostic {
  const range = getRange(error, textDocument);
  const message = getMessage(error);
  const severity = getSeverity(error);

  let diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = "packer validate";

  return diagnostic;
}

function getRange(
  error: Error,
  textDocument: vscode.TextDocument
): vscode.Range {
  const textLine: vscode.TextLine = textDocument.lineAt(error.lineNum - 1);
  const startCharPos = textLine.text.indexOf(error.excerpt);
  const endCharPos = startCharPos + error.excerpt.length;
  if (startCharPos < 0) {
    throw new Error(
      `Could not find excerpt '${error.excerpt}' in line: ${textLine.text}`
    );
  }

  const start: vscode.Position = new vscode.Position(
    error.lineNum - 1,
    startCharPos
  );
  const end: vscode.Position = new vscode.Position(
    error.lineNum - 1,
    endCharPos
  );

  return new vscode.Range(start, end);
}

function getMessage(error: Error): string {
  return error.explanation;
}

function getSeverity(error: Error): vscode.DiagnosticSeverity {
  if (error.level === "error") {
    return vscode.DiagnosticSeverity.Error;
  }

  return vscode.DiagnosticSeverity.Warning;
}

type ErrorLevel = "error";

interface Error {
  level: ErrorLevel;
  kind: string;
  explanation: string;
  path: string;
  fileName: string;
  lineNum: number;
  token: string;
  excerpt: string;
}

function getErrors(errorsString: string): Error[] {
  // Split the errors string by \n\n delimiter, and drop the extra \n at the end
  const errorStrings = errorsString.split("\\n\\n").slice(0, -1);

  const errorStringGroups = chunk(errorStrings, 3);

  const errors: Map<string, Error> = new Map();

  for (const errorStringGroup of errorStringGroups) {
    const [line1, line2And3, line4] = errorStringGroup;
    const [line2, line3] = line2And3.split("\\n");

    /* Line 1 */
    const [errorLevelString, kind] = line1.split(": ");
    const level = getErrorLevel(errorLevelString);

    /* Line 2 */
    // Remove the leading '  on '
    const line2Clean = line2.substring(5);
    const [path, lineNumAndTokenRaw] = line2Clean.split(" line ");
    const [lineNumText, tokenRaw] = lineNumAndTokenRaw.split(
      "%!(PACKER_COMMA) in "
    );
    const lineNum = Number(lineNumText.trim());
    const fileNameParts = path.split("/");
    const fileName = fileNameParts.pop()?.trim();
    if (!fileName || typeof fileName !== "string") {
      throw new Error(`fileName is not a string: ${fileName}`);
    }
    // Remove the trailing ":"
    const token = tokenRaw.substring(0, tokenRaw.length - 1).trim();

    /* Line 3 */
    const excerpt = line3.split(": ")[1].trim();

    /* Line 4 */
    const explanation = line4
      .replace("%!(PACKER_COMMA)", ",")
      .split("\\n")
      .join(" ")
      .trim();

    const error: Error = {
      level,
      kind,
      explanation,
      path,
      fileName,
      lineNum,
      token,
      excerpt,
    };

    errors.set(JSON.stringify(error), error);
  }

  // unique errors
  return Array.from(errors.values());
}

function getErrorLevel(errorTypeString: string): ErrorLevel {
  if (errorTypeString === "Error") {
    return "error";
  }

  throw new Error(`Unknown error type: ${errorTypeString}`);
}

function chunk<T>(arr: Array<T>, chunkSize: number): Array<Array<T>> {
  const res = [];

  while (arr.length > 0) {
    const chunk = arr.splice(0, chunkSize);
    res.push(chunk);
  }

  return res;
}
