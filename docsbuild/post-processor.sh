#!/usr/bin/env bash

echo "----------------------"
echo "Running post-processor"
echo "----------------------"

# Make the output docs dir
mkdir -p ../docs/builders

# Process the builder .mdx doc files
for file in processors/builders/scratch/*.mdx; do
  # echo "$file"

  # echo "output_for_$file" >"../../../../docs/builders/$file"
  ./json_from_mdx.rb --mdx-file "$file"
done
