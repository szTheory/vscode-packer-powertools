# <img src="./images/icon.png" width="24"> Packer Powertools

VS Code extension for Packer with code formatting, inline error messages, syntax highlighting, code folding, and command palette integration.

Also has tooltip popups with documentation. Currently supports it for the base Packer feature set, as well as for these builders:

- amazon-ebs

and these provisioners:

- ansible
- ansible-local

If you want tooltip support for another builder or provisioner, create an issue on the Github site and I'll add them in the order of most requested.

## Features

Code formatting

![Code formatting](./images/code-formatting.gif)

Validation

![Validation](./images/validation.png)

Syntax highlighting

![Syntax highlighting](./images/syntax-highlighting.png)

Code folding

![Code folding](./images/code-folding.gif)

Toggle comments

![Toggle comments](./images/toggle-comments.gif)

Commands

- `packer init`
- `packer build`
- `packer inspect`

![Commands](./images/commands.gif)

## Requirements

You must have Packer installed and in your system `PATH`.

## Release Notes

### 0.4.0

- TODO: pull these from the git history and git diff

- Add documentation hover tooltips
- Fix syntax highlighting bug for blocks with dashes (-) in them, such as `error-cleanup-provisioner`
- Update syntax definition file to use top-level blocks for Packer instead of Terraform
- Update syntax definition file to use Packer built-in functions instead of Terraform

### 0.3.0

- Update to the latest syntax highlighting file from the [HashiCorp Syntax](https://github.com/hashicorp/syntax) repo

### 0.2.0

- Add `packer inspect` command
- Update syntax highlighting to look the same as the official Terraform plugin

### 0.1.0

- Initial release
