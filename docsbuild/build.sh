#!/usr/bin/env bash

# TODO: add the option to delete existing repos and download fresh ones
# with a command line flag

# Change into scratch dir
cd scratch || exit

# Create a dir to store git repos of docs
mkdir -p git
cd git || exit

# Clone the Packer repo
[ -d packer ] || git clone --depth=1 https://github.com/hashicorp/packer.git packer

# Get a list of all builder doc repos
lines=$(jq --raw-output 'map(.repo) | unique | join("\n")' packer/website/data/plugins-manifest.json)

# Change into the builders dir where we still store the builder doc repos
mkdir -p builders
cd builders || exit

# Downlaad each builder repo
for line in $lines; do
  # Extract the plugin name from the repo path,
  # for example "hashicorp/packer-plugin-qemu" -> "qemu"
  plugin_name=$(echo "${line}" | cut -d "-" -f3)

  # Download the repo
  [ -d "$plugin_name" ] || git clone --depth=1 "https://github.com/$line" "$plugin_name"
done

# Change back into main docsbuild folder
cd ../../../ || exit

# Create an output dir to store the docs
mkdir -p scratch/output

# Change into the processors dir for builders
mkdir -p processors/builders
cd processors/builders || exit

# Run each builder doc processor
for file in *.sh; do
  echo "Running ./$file"
  "./$file"
done

cd ../../ || exit

# Run post-processor
./post-processor.sh
