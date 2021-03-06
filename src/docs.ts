import * as vscode from "vscode";

// Blocks
import * as block_build from "./docs/blocks/build.json";
import * as block_data from "./docs/blocks/data.json";
import * as block_dynamic from "./docs/blocks/dynamic.json";
import * as block_locals from "./docs/blocks/locals.json";
import * as block_local from "./docs/blocks/local.json";
import * as block_packer from "./docs/blocks/packer.json";
import * as block_source from "./docs/blocks/source.json";
import * as block_variable from "./docs/blocks/variable.json";
import * as block_variables from "./docs/blocks/variables.json";

// Nested blocks - build
import * as block_nested_build_hcp_packer_registry from "./docs/blocks/nested/build/hcp_packer_registry.json";
import * as block_nested_build_error_cleanup_provisioner from "./docs/blocks/nested/build/error-cleanup-provisioner.json";
import * as block_nested_build_post_processor from "./docs/blocks/nested/build/post-processor.json";
import * as block_nested_build_post_processors from "./docs/blocks/nested/build/post-processors.json";
import * as block_nested_build_provisioner from "./docs/blocks/nested/build/provisioner.json";
import * as block_nested_build_source from "./docs/blocks/nested/build/source.json";
// Nested blocks - build - post-processor
import * as block_nested_build_post_processors_post_processor from "./docs/blocks/nested/build/post-processors/post-processor.json";
// Nested blocks - packer
import * as block_nested_build_packer_required_plugins from "./docs/blocks/nested/packer/required_plugins.json";
// Nested blocks - variable
import * as block_nested_variable_validation from "./docs/blocks/nested/variable/validation.json";
// Nested blocks - source
import * as block_nested_source_amazon_ebs_assume_role from "./docs/blocks/nested/source/amazon-ebs/assume_role.json";
import * as block_nested_source_amazon_ebs_vault_aws_engine from "./docs/blocks/nested/source/amazon-ebs/vault_aws_engine.json";
import * as block_nested_source_amazon_ebs_aws_polling from "./docs/blocks/nested/source/amazon-ebs/aws_polling.json";

// Arguments
import * as arguments_build from "./docs/arguments/build.json";
import * as arguments_build_hcr_packer_registry from "./docs/arguments/build/hcr_packer_registry.json";
import * as arguments_build_post_processor from "./docs/arguments/build/post-processor.json";
import * as arguments_build_source from "./docs/arguments/build/source.json";
import * as arguments_dynamic from "./docs/arguments/dynamic.json";
import * as arguments_local from "./docs/arguments/local.json";
import * as arguments_packer from "./docs/arguments/packer.json";
import * as arguments_source from "./docs/arguments/source.json";
import * as arguments_variable from "./docs/arguments/variable.json";
import * as arguments_variable_validation from "./docs/arguments/variable/validation.json";

// Context vars
import * as contextvars_build from "./docs/context-variables/build.json";
import * as contextvars_packer from "./docs/context-variables/packer.json";
import * as contextvars_path from "./docs/context-variables/path.json";
import * as contextvars_source from "./docs/context-variables/source.json";

// Packer functions
import * as packer_functions from "./docs/functions.json";

// Block names
import * as blockname_provisioner_ansible from "./docs/blocknames/provisioner/ansible.json";
import * as blockname_provisioner_ansible_local from "./docs/blocknames/provisioner/ansible-local.json";
import * as blockname_source_amazon_ebs from "./docs/blocknames/source/amazon-ebs.json";
import * as blockname_source_file from "./docs/blocknames/source/file.json";
import * as blockname_source_null from "./docs/blocknames/source/null.json";

// Builder args
import * as builder_file from "./docs/arguments/source_builders/file.json";
import * as builder_ansible from "./docs/arguments/source_builders/ansible.json";
import * as builder_ansible_local from "./docs/arguments/source_builders/ansible-local.json";
import * as builder_amazon_ebs from "./docs/arguments/source_builders/amazon-ebs.json";
import * as builder_amazon_ebs_assume_role from "./docs/arguments/source_builders/amazon-ebs/assume_role.json";
import * as builder_amazon_ebs_vault_aws_engine from "./docs/arguments/source_builders/amazon-ebs/vault_aws_engine.json";
import * as builder_amazon_ebs_aws_polling from "./docs/arguments/source_builders/amazon-ebs/aws_polling.json";

// TODO: read this from the language-configuration json file?
const WORD_REGEX_STR =
  "(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\$\\%\\^\\&\\*\\(\\)\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\\\\\s\\/\\?\\s]+)";
const WORD_REGEX = new RegExp(WORD_REGEX_STR, "g");
const STARTS_WITH_WHITESPACE_REGEX = /^(\s+)/;
const BLOCK_SUBNAME_REGEX = /\"([\w-]+)\"/;

export const hoverProvider: vscode.HoverProvider = { provideHover };
// TODO: build this dynamically by looping over the files in the docs folder
const CONTEXT_VAR_TYPES = ["build", "source", "packer", "path"];

function provideHover(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken
): vscode.ProviderResult<vscode.Hover> {
  return new Promise((resolve, _reject) => {
    // Get the word and current line
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return resolve(null);
    }
    const word = document.getText(wordRange);
    const line = document.lineAt(position.line);

    console.log(position);
    console.log(word);
    console.log(line.text);
    console.log("-----");

    // Ignore words that have a space in them or are empty
    if (word.indexOf(" ") >= 0 || word === "") {
      resolve(null);
    }

    // Is it a function?
    if (line.text.charAt(wordRange.end.character) === "(") {
      console.log(`---- FUNCTION: ${word}`);
      const json = getFunctionJSON(word);
      const markdown = `**[${json.signature}](${json.url})** *${json.type} function*\n\n${json.description}`;
      resolve(new vscode.Hover(markdown));
    }

    // Is it an attribute assignment? (a line with an = symbol)
    if (line.text.indexOf("=") >= 0) {
      console.log("---- ATTRIBUTE");
      // Find where the equals sign is
      const equalsSignIndex = line.text.indexOf("=");

      // Is it the attribute itself? (to the left of the = symbol)
      if (position.character < equalsSignIndex) {
        console.log("ATTRIBUTE");

        const parentBlock = findParentBlock(word, line, document);
        if (!parentBlock) {
          throw new Error(
            "Could not find parent block type but it should be present for an attribute."
          );
        }

        const grandparentBlock = findParentBlock(
          parentBlock.type,
          document.lineAt(parentBlock.lineNum),
          document
        );

        const json = getArgumentJSON(
          grandparentBlock?.type || null,
          grandparentBlock?.name || null,
          parentBlock.type,
          parentBlock.name || null,
          word
        );
        const requiredText = json.required ? "required" : "optional";
        const secondaryText = [requiredText, json.type]
          .filter((x) => x)
          .join(", ");
        const wordMarkdown = json.url ? `[${word}](${json.url})` : word;
        const markdown = `**${wordMarkdown}** *${secondaryText}* \n\n${json.description}`;
        resolve(new vscode.Hover(markdown));

        // Or is it something to the right of the = symbol?
      }
    }

    // Is it a block? (a line ending with an { symbol)
    if (line.text.trim().endsWith("{")) {
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

      // Is it a block type? (comes before the first quote, or there is no quote)
      if (firstQuoteIndex < 0 || position.character < firstQuoteIndex) {
        // TODO: determine what is the closest block name it's nested in
        // Is it a nested block?
        if (STARTS_WITH_WHITESPACE_REGEX.test(line.text)) {
          const parentBlock = findParentBlock(word, line, document);

          const json = getNestedBlockJSON(
            word,
            parentBlock?.type || null,
            parentBlock?.name || null
          );
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

      // Is it a block name? Comes after the first quote, but before any second quote
      if (
        firstQuoteIndex > 0 &&
        position.character > firstQuoteIndex &&
        (secondQuoteIndex < 0 || position.character < secondQuoteIndex)
      ) {
        const results = line.text.match(WORD_REGEX);
        if (!results || results.length < 1) {
          throw new Error(
            "Could not find a block type in the line, but it should have been there."
          );
        }
        const blockType = results[0];

        let secondaryText = null;
        switch (blockType) {
          case "source":
            secondaryText = "builder";
            break;
          default:
            secondaryText = blockType;
        }

        const json = getBlockNameJSON(blockType, word);
        const markdown = `**[${word}](${json.url})** *${secondaryText}* \n\n${json.description}`;
        resolve(new vscode.Hover(markdown));
      }
    }

    // Is it a context variable? (has a dot before, and a } after)
    if (line.text.charAt(wordRange.start.character - 1) === ".") {
      console.log("--- CONTEXT VAR");
      const lineUpToJustBeforeDot = line.text.substring(
        0,
        wordRange.start.character - 1
      );
      const blockType = CONTEXT_VAR_TYPES.find((x) =>
        lineUpToJustBeforeDot.endsWith(x)
      );
      if (blockType) {
        const json = getContextVarableJSON(blockType, word);
        const wordMarkdown = json.url ? `[${word}](${json.url})` : word;
        const markdown = `**${wordMarkdown}** *${json.type}* \n\n${json.description}`;
        resolve(new vscode.Hover(markdown));
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

interface ParentBlock {
  type: string;
  name: string | null;
  subName: string | null;
  lineNum: number;
}

function findParentBlock(
  word: string,
  line: vscode.TextLine,
  document: vscode.TextDocument
): ParentBlock | null {
  // Dynamic blocks can be in any other parent block
  if (word === "dynamic") {
    return null;
  }

  const matches = STARTS_WITH_WHITESPACE_REGEX.exec(line.text);
  const whitespaceLengthCurrentLine = matches ? matches[0].length : 0;
  // Already at a top-level block
  if (whitespaceLengthCurrentLine === 0) {
    return null;
  }

  // Find the closest parent block
  let foundParentBlock = false;
  let nextSearchLineNum = line.lineNumber;
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

  const results = parentLine.text.match(WORD_REGEX);
  if (!results || results.length < 1) {
    throw new Error(
      "Could not find a word in the parent line, but it should have been there."
    );
  }
  const parentBlockType = results[0];
  const parentBlockName = results[1];

  const subName = findBlockSubName(parentLine.text);

  return {
    type: parentBlockType,
    name: parentBlockName || null,
    lineNum: nextSearchLineNum,
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

interface BlockTooltipInfo {
  description: string;
  url: string;
}

function getNestedBlockJSON(
  blockType: string,
  parentBlockType: string | null,
  parentBlockName: string | null
): BlockTooltipInfo {
  switch (parentBlockType) {
    case null:
      switch (blockType) {
        case "dynamic":
          return block_dynamic;
        default:
          throw new Error(`Block not found: ${blockType}`);
      }

    case "build":
      switch (blockType) {
        case "hcp_packer_registry":
          return block_nested_build_hcp_packer_registry;
        case "error-cleanup-provisioner":
          return block_nested_build_error_cleanup_provisioner;
        case "post-processor":
          return block_nested_build_post_processor;
        case "post-processors":
          return block_nested_build_post_processors;
        case "provisioner":
          return block_nested_build_provisioner;
        case "source":
          return block_nested_build_source;
        default:
          throw new Error(`Block not found: ${blockType}`);
      }

    case "packer":
      switch (blockType) {
        case "required_plugins":
          return block_nested_build_packer_required_plugins;
        default:
          throw new Error(`Block not found: ${blockType}`);
      }

    case "post-processors":
      switch (blockType) {
        case "post-processor":
          return block_nested_build_post_processors_post_processor;
        default:
          throw new Error(`Block not found: ${blockType}`);
      }

    case "source":
      switch (parentBlockName) {
        case "amazon-ebs":
          switch (blockType) {
            case "assume_role":
              return block_nested_source_amazon_ebs_assume_role;
            case "aws_polling":
              return block_nested_source_amazon_ebs_aws_polling;
            case "vault_aws_engine":
              return block_nested_source_amazon_ebs_vault_aws_engine;
            default:
              throw new Error(
                `Block not found: ${blockType} for parent block name: ${parentBlockName}`
              );
          }
        default:
          throw new Error(
            `Block not found: ${blockType} for parent block name: ${parentBlockName}`
          );
      }

    case "variable":
      switch (blockType) {
        case "validation":
          return block_nested_variable_validation;
        default:
          throw new Error(`Block not found: ${blockType}`);
      }

    default:
      throw new Error(`Parent block not found: ${parentBlockType}`);
  }
}

function getBlockJSON(blockName: string): BlockTooltipInfo {
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

type PackerFunctionType =
  | "contextual"
  | "numeric"
  | "string"
  | "collection"
  | "encoding"
  | "filesystem"
  | "date and time"
  | "hash and crypto"
  | "uuid"
  | "ip network"
  | "type conversion";

interface PackerFunction {
  description: string;
  signature: string;
  type: PackerFunctionType;
  url: string;
}

function getFunctionJSON(funcName: string): PackerFunction {
  return (packer_functions as any)[funcName];
}

interface Argument {
  description: string;
  required: boolean;
  type: string | null;
  url: string | null;
}

function getArgumentJSON(
  grandparentBlockType: string | null,
  grandparentBlockName: string | null,
  parentBlockType: string,
  parentBlockName: string | null,
  argumentName: string
): Argument {
  // "default" seems to be a reserved key on JS objects, so we have to munge it
  if (argumentName === "default") {
    argumentName = "defaultArg";
  }

  switch (grandparentBlockType) {
    case null:
      switch (parentBlockType) {
        case "build":
          return (arguments_build as any)[argumentName];
        case "local":
          return (arguments_local as any)[argumentName];
        case "packer":
          return (arguments_packer as any)[argumentName];
        case "dynamic":
          return (arguments_dynamic as any)[argumentName];
        case "source":
          return getBuilderArg(parentBlockName, null, argumentName);
        case "variable":
          return (arguments_variable as any)[argumentName];

        default:
          throw new Error(
            `Parent argument block not found: ${parentBlockType}`
          );
      }
    case "build":
      switch (parentBlockType) {
        case "hcp_packer_registry":
          return (arguments_build_hcr_packer_registry as any)[argumentName];
        case "provisioner":
          return getBuilderArg(parentBlockName, null, argumentName);
        case "post-processor":
          return (arguments_build_post_processor as any)[argumentName];
        case "source":
          return (arguments_build_source as any)[argumentName];

        default:
          throw new Error(
            `Parent argument block not found: ${parentBlockType}`
          );
      }
    case "source":
      return getBuilderArg(grandparentBlockName, parentBlockType, argumentName);
    case "variable":
      switch (parentBlockType) {
        case "validation":
          return (arguments_variable_validation as any)[argumentName];
        default:
          throw new Error(
            `Parent argument block not found: ${parentBlockType}`
          );
      }

    default:
      throw new Error(
        `Grandparent argument block not found: ${grandparentBlockType}`
      );
  }
}

function getBuilderArg(
  builderName: string | null,
  parentArgumentName: string | null,
  argumentName: string
): Argument {
  const baseArg = (arguments_source as any)[argumentName];
  let arg = null;

  switch (builderName) {
    case "ansible":
      arg = (builder_ansible as any)[argumentName];
      break;
    case "ansible-local":
      arg = (builder_ansible_local as any)[argumentName];
      break;
    case "amazon-ebs":
      switch (parentArgumentName) {
        case null:
          arg = (builder_amazon_ebs as any)[argumentName];
          break;
        case "assume_role":
          arg = (builder_amazon_ebs_assume_role as any)[argumentName];
          break;
        case "aws_polling":
          arg = (builder_amazon_ebs_aws_polling as any)[argumentName];
          break;
        case "vault_aws_engine":
          arg = (builder_amazon_ebs_vault_aws_engine as any)[argumentName];
          break;
        default:
          throw new Error(
            `Argument not found: ${argumentName} for parent argument ${parentArgumentName}`
          );
      }
      break;
    case "file":
      arg = (builder_file as any)[argumentName];
      break;
  }

  return arg || baseArg;
}

function getContextVarableJSON(blockName: string, varName: string): Argument {
  switch (blockName) {
    case "build":
      return (contextvars_build as any)[varName];
    case "packer":
      return (contextvars_packer as any)[varName];
    case "path":
      return (contextvars_path as any)[varName];
    case "source":
      return (contextvars_source as any)[varName];

    default:
      throw new Error(`Context variable block not found: ${blockName}`);
  }
}

function getBlockNameJSON(
  blockType: string,
  blockName: string
): BlockTooltipInfo {
  switch (blockType) {
    case "provisioner":
      switch (blockName) {
        case "ansible":
          return blockname_provisioner_ansible;
        case "ansible-local":
          return blockname_provisioner_ansible_local;
        default:
          throw new Error(
            `Block name JSON for ${blockName} in block type ${blockType} not found`
          );
      }
    case "source":
      switch (blockName) {
        case "amazon-ebs":
          return blockname_source_amazon_ebs;
        case "file":
          return blockname_source_file;
        case "null":
          return blockname_source_null;
        default:
          throw new Error(
            `Block name JSON for ${blockName} in block type ${blockType} not found`
          );
      }

    default:
      throw new Error(`Block name JSON for block type ${blockType} not found`);
  }
}
