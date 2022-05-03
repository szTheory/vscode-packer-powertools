#!/usr/bin/env ruby

# frozen_string_literal: true

require "json"
require "optparse"
# TODO: remove this
require "pry"

# rubocop:disable Metrics/MethodLength
# rubocop:disable Metrics/AbcSize
def parse_packer_args(raw_args_text:, url: "", required:)
  raw_args_text_split = raw_args_text.split("\n\n")

  args = {}
  shared_description = ""

  if (!raw_args_text_split.first.start_with?("- "))
    shared_description = raw_args_text_split.shift.gsub("\n", " ")
  end

  raw_args_text_split.each do |raw|
    arg_name = /^- \`(.+)\` \(/ms.match(raw)[1]
    type_val = /\((.+)\) - /ms.match(raw)[1]
    desc_matches = / - (.+)$/ms.match(raw)
    desc = desc_matches.nil? ? "" : desc_matches[1].split(" - ")[-1].gsub("\n", " ").gsub(/\s+/, " ")

    args[arg_name.intern] = {
      type: type_val.strip,
      description: desc.strip,
      url: url.strip,
      required: required,
      shared_description: shared_description.strip,
    }
  end

  args
end

# rubocop:enable Metrics/MethodLength
# rubocop:enable Metrics/AbcSize

# Parse CLI args
options = {}
OptionParser.new do |parser|
  parser.banner = "Usage: json_from_mdx.rb [options]"

  parser.on("-f [filename]", "--mdx-file", "File path for the Packer mdx doc file") do |value|
    options[:filename] = value
  end
  parser.on("-u [url]", "--url", "URL this entry will point to") do |value|
    options[:url] = value
  end
  parser.on("-r [boolean]", "--required", "Whether these args are required or not") do |value|
    options[:required] = value.downcase == "true" || value.downcase == "yes" || value.downcase == "y" || value.downcase == "required"
  end
end.parse!

# Get the filename
filename = options[:filename]

# Read the file
file = File.open(filename, "r")
contents = file.read

# New document

doc = parse_packer_args(raw_args_text: contents, url: options[:url], required: options[:required])

pp doc

output_path = filename.gsub(".mdx", ".json")

File.open(output_path, "wb") do |f|
  f.puts JSON.pretty_generate(doc)
end
