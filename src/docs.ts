import * as vscode from "vscode";

// Blocks
import * as block_build from "./docs/blocks/build.json";
import * as block_data from "./docs/blocks/data.json";
import * as block_locals from "./docs/blocks/locals.json";
import * as block_local from "./docs/blocks/local.json";
import * as block_packer from "./docs/blocks/packer.json";
import * as block_source from "./docs/blocks/source.json";
import * as block_variable from "./docs/blocks/variable.json";
import * as block_variables from "./docs/blocks/variables.json";

// Nested blocks - build
import * as block_nested_build_hcp_packer_registry from "./docs/blocks/nested/build/hcp_packer_registry.json";
import * as block_nested_build_post_processors from "./docs/blocks/nested/build/post-processors.json";
import * as block_nested_build_provisioner from "./docs/blocks/nested/build/provisioner.json";
import * as block_nested_build_source from "./docs/blocks/nested/build/source.json";
// Nested blocks - build - post-processor
import * as block_nested_build_post_processors_post_processor from "./docs/blocks/nested/build/post-processors/post-processor.json";
// Nested blocks - packer
import * as block_nested_build_packer_required_plugins from "./docs/blocks/nested/packer/required_plugins.json";
// Nested blocks - variable
import * as block_nested_variable_validation from "./docs/blocks/nested/variable/validation.json";

// Arguments
import * as arguments_local from "./docs/arguments/local.json";
import * as arguments_variable from "./docs/arguments/variable.json";
import * as arguments_variable_validation from "./docs/arguments/variable/validation.json";

// TODO: read this from the language-configuration json file
const WORD_REGEX_STR =
  "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\$\\%\\^\\&\\*\\(\\)\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\\\\\s\\/\\?\\s]+)";
const WORD_REGEX = new RegExp(WORD_REGEX_STR);
const STARTS_WITH_WHITESPACE_REGEX = /^(\s+)/;
const BLOCK_SUBNAME_REGEX = /\"([\w-]+)\"/;

export const hoverProvider: vscode.HoverProvider = { provideHover };

function provideHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Hover> {
  return new Promise((resolve, _reject) => {
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

    // Is it an attribute assignment? (a line with an = symbol)
    if (line.text.indexOf("=") >= 0) {
      console.log("---- ATTRIBUTE");
      // Find where the equals sign is
      const equalsSignIndex = line.text.indexOf("=");

      // Is it the attribute itself? (to the left of the = symbol)
      if (position.character < equalsSignIndex) {
        console.log("ATTRIBUTE");

        const parentBlockType = findParentBlockType(line, position, document);
        if (!parentBlockType) {
          throw new Error(
            "Could not find parent block type but it should be present for an attribute."
          );
        }
        const json = getArgumentJSON(parentBlockType.name, word);
        const requiredText = json.required ? "required" : "optional";
        const wordMarkdown = json.url ? `[${word}](${json.url})` : word;
        const markdown = `**${wordMarkdown}** *${requiredText}* \n\n${json.description}`;
        resolve(new vscode.Hover(markdown));

        // Or is it something to the right of the = symbol?
      } else {
        // TODO: check if it's a function

        // If it's not a function, ignore
        console.log("TO THE RIGHT OF = SYMBOL");
        resolve(null);
      }

      // Is it a block? (a line with an { symbol)
    } else if (line.text.indexOf("{") >= 0) {
      console.log("---- BLOCK");

      // Find the second quote symbol
      const firstQuoteIndex = line.text.indexOf('"');
      const secondQuoteIndex = line.text.indexOf('"', firstQuoteIndex + 1);

      // Ignore anything after the second quote symbol
      if (secondQuoteIndex > 0 && position.character > secondQuoteIndex) {
        console.log("IGNORING");
        resolve(null);
      }
      console.log("first quote index: " + firstQuoteIndex);

      // Is it a block name? (comes before the first quote, or there is no quote)
      if (firstQuoteIndex < 0 || position.character < firstQuoteIndex) {
        // TODO: determine what is the closest block name it's nested in
        // Is it a nested block?
        if (STARTS_WITH_WHITESPACE_REGEX.test(line.text)) {
          const parentBlockType = findParentBlockType(line, position, document);
          if (!parentBlockType) {
            throw new Error(
              "There should have been a parent block type at this point in execution"
            );
          }

          console.log(`parent block: ${parentBlockType.name}`);
          const json = getNestedBlockJSON(word, parentBlockType.name);
          const markdown = `**[${word}](${json.url})** *Block* \n\n${json.description}`;
          resolve(new vscode.Hover(markdown));

          // Otherwise it must be a top-level block
          console.log("NESTED BLOCK");
        } else {
          console.log("TOP-LEVEL BLOCK");
          const json = getBlockJSON(word);
          const markdown = `**[${word}](${json.url})** *Block* \n\n${json.description}`;
          resolve(new vscode.Hover(markdown));
        }
      }
    }

    // TODO: check for nested "block" level assignments, like this:
    // happycloud = {
    //   version = ">= 2.7.0"
    //   source  = "github.com/hashicorp/happycloud"
    // }

    resolve(null);
  });
}

interface ParentBlockType {
  name: string;
  subName: string | null;
}

function findParentBlockType(
  line: vscode.TextLine,
  position: vscode.Position,
  document: vscode.TextDocument
): ParentBlockType | null {
  const matches = STARTS_WITH_WHITESPACE_REGEX.exec(line.text);
  if (!matches) {
    throw new Error(
      "Could not find whitespace, but it should be there by this point in execution."
    );
  }
  const whitespaceLengthCurrentLine = matches[0].length;

  // Find the closest parent block
  let foundParentBlock = false;
  let nextSearchLineNum = position.line;
  let parentLine: vscode.TextLine | null = null;
  while (!foundParentBlock && nextSearchLineNum > 0) {
    nextSearchLineNum -= 1;
    parentLine = document.lineAt(nextSearchLineNum);

    // Don't bother checking if there is no block symbol on this line
    if (parentLine.text.indexOf("{") < 0) {
      continue;
    }

    const parentLineMatches = STARTS_WITH_WHITESPACE_REGEX.exec(
      parentLine.text
    );
    // If the parent line has no whitespace (it's top-level),
    // or if there's less whitespace on the parent line than on the current line
    if (
      !parentLineMatches ||
      (parentLineMatches &&
        parentLineMatches[0].length < whitespaceLengthCurrentLine)
    ) {
      foundParentBlock = true;
    }
  }

  // Didn't find the parent block
  if (!foundParentBlock) {
    return null;
  }

  if (!parentLine) {
    throw new Error(
      "There should have been a parent line set by now if we found it in the logic above."
    );
  }
  console.log(`parent block line: ${parentLine.text}`);

  const results = WORD_REGEX.exec(parentLine.text);
  if (!results) {
    throw new Error(
      "Could not find a word in the parent line, but it should have been there."
    );
  }

  const parentBlockName = results[0];
  const subName = findBlockSubName(parentLine.text);

  return {
    name: parentBlockName,
    subName,
  };
}

function findBlockSubName(line: string): string | null {
  if (line.indexOf('"') < 0) {
    return null;
  }

  const result = BLOCK_SUBNAME_REGEX.exec(line);
  if (!result) {
    return null;
  }

  return result[0];
}

interface Block {
  description: string;
  url: string;
}

function getNestedBlockJSON(blockName: string, parentBlockName: string): Block {
  switch (parentBlockName) {
    case "build":
      switch (blockName) {
        case "hcp_packer_registry":
          return block_nested_build_hcp_packer_registry;
        case "post-processors":
          return block_nested_build_post_processors;
        case "provisioner":
          return block_nested_build_provisioner;
        case "source":
          return block_nested_build_source;
        default:
          throw new Error(`Block not found: ${blockName}`);
      }

    case "packer":
      switch (blockName) {
        case "required_plugins":
          return block_nested_build_packer_required_plugins;
        default:
          throw new Error(`Block not found: ${blockName}`);
      }

    case "post-processors":
      switch (blockName) {
        case "post-processor":
          return block_nested_build_post_processors_post_processor;
        default:
          throw new Error(`Block not found: ${blockName}`);
      }

    case "variable":
      switch (blockName) {
        case "validation":
          return block_nested_variable_validation;
        default:
          throw new Error(`Block not found: ${blockName}`);
      }

    default:
      throw new Error(`Parent block not found: ${parentBlockName}`);
  }
}

function getBlockJSON(blockName: string): Block {
  switch (blockName) {
    case "build":
      return block_build;
    case "data":
      return block_data;
    case "local":
      return block_local;
    case "locals":
      return block_locals;
    case "packer":
      return block_packer;
    case "source":
      return block_source;
    case "variable":
      return block_variable;
    case "variables":
      return block_variables;

    default:
      throw new Error(`Block not found: ${blockName}`);
  }
}

interface Argument {
  description: string;
  required: boolean;
  url?: string;
}

function getArgumentJSON(blockName: string, argumentName: string): Argument {
  // "default" seems to be a reserved key on JS objects, so we have to munge it
  if (argumentName === "default") {
    argumentName = "defaultArg";
  }

  switch (blockName) {
    case "local":
      return (arguments_local as any)[argumentName];
    case "variable":
      return (arguments_variable as any)[argumentName];
    case "validation":
      return (arguments_variable_validation as any)[argumentName];

    default:
      throw new Error(`Argument block not found: ${blockName}`);
  }
}
