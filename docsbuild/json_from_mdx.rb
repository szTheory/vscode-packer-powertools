#!/usr/bin/env ruby

require "json"
require "optparse"
# TODO: remove this
require "pry"

def get_first_paragraph(text:)
  text.split("\n\n")[1].gsub("\n", " ")
end

def get_example(text:)
  /```hcl\n(.+)```/ms.match(text)[1].strip
end

def get_required_raw(text:)
  /### Required:\n\n(.+)###/ms.match(text)[1].strip
end

def get_optional_raw(text:)
  /### Optional:\n\n(.+)/ms.match(text)[1].strip
end

def parse_packer_args(raw_args_text:)
  raw_args_text_split = raw_args_text.split("\n\n")

  args = {}

  # Shared description for the args
  while !raw_args_text_split.empty?
    if raw_args_text_split.first.start_with?("- `")
      break
    end
    args[:shared_description] ||= ""
    args[:shared_description] += raw_args_text_split.shift
  end
  if args[:shared_description]
    args[:shared_description] = args[:shared_description].gsub("\n", " ").strip
  end

  args[:items] = raw_args_text_split.map do |raw|
    item = {}
    puts raw
    item[:name] = /`(.+)`/ms.match(raw)[1]
    item[:type] = /\((.+)\)/ms.match(raw)[1]
    item[:description] = / - (.+)/ms.match(raw)[1].gsub("\n", " ").gsub(/\s+/, " ")
    item
  end

  args
end

# Parse CLI args
options = {}
OptionParser.new do |parser|
  parser.banner = "Usage: json_from_mdx.rb [options]"

  parser.on("-f [filename]", "--mdx-file", "File path for the Packer mdx doc file") do |value|
    options[:filename] = value
  end
end.parse!

# Get the filename
filename = options[:filename]

# Read the file
file = File.open(filename, "r")
contents = file.read

# New document
doc = {}

# Type
doc[:type] = /Type: `(\w+)`/.match(contents)[1]

# Artifact Builder ID
doc[:artifact_builder_id] = /Artifact BuilderId: `([\w\.]+)`/.match(contents)[1]

# Description
doc[:description] = get_first_paragraph(text: contents)

# Example
doc[:hcl_example] = get_example(text: contents)

# Required args
required_raw = get_required_raw(text: contents)
doc[:required] = parse_packer_args(raw_args_text: required_raw)

# Optional args
optional_raw = get_optional_raw(text: contents)
doc[:optional] = parse_packer_args(raw_args_text: optional_raw)

pp doc
