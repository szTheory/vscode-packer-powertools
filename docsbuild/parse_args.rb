#!/usr/bin/env ruby

# frozen_string_literal: true

require "json"
require "optparse"
# TODO: remove this
require "pry"

# rubocop:disable Metrics/MethodLength
# rubocop:disable Metrics/AbcSize
# rubocop:disable Metrics/CyclomaticComplexity
# rubocop:disable Metrics/PerceivedComplexity
def parse_packer_args(raw_args_text:, required:, url: "")
  raw_args_text_split = raw_args_text.gsub(/\n\s+\n/, "\n\n").split("\n\n").map(&:strip)

  args = {}
  shared_description = ""

  # rubocop:disable Style/IfUnlessModifier
  unless raw_args_text_split.first.start_with?("- ")
    shared_description = raw_args_text_split.shift.gsub(/\n/, " ")
  end
  # rubocop:enable Style/IfUnlessModifier

  # group extra paragraphs onto the previous item
  args_text_grouped = []
  raw_args_text_split.each do |arg_text|
    if arg_text.start_with?("- ")
      args_text_grouped.push(arg_text)
    else
      # rubocop:disable Style/StringLiteralsInInterpolation
      args_text_grouped[-1] += "\n\n#{arg_text.gsub(/\s+/, " ")}"
      # rubocop:enable Style/StringLiteralsInInterpolation
    end
  end

  args_text_grouped.each do |raw|
    begin
      arg_name = /^- \`([^``]+)\` \(/ms.match(raw)[1]
    rescue Encoding::CompatibilityError => e
      binding.pry
    end
    type_val = /\(([^)]+)\) - /ms.match(raw)[1]
    desc_matches = / - (.+)$/ms.match(raw)
    desc_matches_str = desc_matches[1]
    desc = if desc_matches.nil?
        ""
      else
        desc_matches_str.split(" - ")[-1].split("\n\n").map do |str|
          str.strip.gsub(/\s+/, " ")
        end.join("\n\n")
      end

    # rubocop:disable Style/TrailingCommaInHashLiteral
    args[arg_name.intern] = {
      type: type_val.strip,
      description: desc.strip,
      url: url.strip,
      required: required,
      shared_description: shared_description.strip,
    }
    # rubocop:enable Style/TrailingCommaInHashLiteral
  end

  args
end

# rubocop:enable Metrics/MethodLength
# rubocop:enable Metrics/AbcSize
# rubocop:enable Metrics/CyclomaticComplexity
# rubocop:enable Metrics/PerceivedComplexity

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
    options[:required] = value.downcase == "true" ||
                         value.downcase == "yes" ||
                         value.downcase == "y" ||
                         value.downcase == "required"
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
