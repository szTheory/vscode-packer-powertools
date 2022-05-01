#!/usr/bin/env bash

echo "---- Processing file builder doc"
pwd | cat

# Copy the file for processing
cp ../../scratch/git/packer/website/content/docs/builders/file.mdx scratch/

# Delete extra stuff from the file
sed -e '1,14d;22,40d;52,62d' -i '' ./scratch/file.mdx
