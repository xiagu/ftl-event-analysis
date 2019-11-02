require "nokogiri"
require "pry"

BASEPATH = "X:/docs/games/FTL event analysis/vanilla/data/"
BLUEPRINT_FILES = ["blueprints", "dlcBlueprints"]

def parse_file(filename)
  File.open(filename) { |f| Nokogiri::XML(f) }
end

def full_path(filename)
  "#{BASEPATH}#{filename}.xml"
end

def read_blueprints(tag)
  BLUEPRINT_FILES.flat_map { |fn|
    parse_file(full_path(fn))
        .css(tag)
        .map { |element| element.attr("name") }
  }
end

AUGMENTS = read_blueprints("augBlueprint")
CREW = read_blueprints("crewBlueprint")
SYSTEMS = read_blueprints("systemBlueprint")

def print_output(req_counts, categorized)
  puts
  puts "Augments"
  puts "--------"
  categorized[:augment]
      .map { |name| [name, req_counts[name]] }
      .sort { |a, b| b[1] <=> a[1] }
      .each { |key, value| puts "#{value} #{key}" }

  puts
  puts "Crew"
  puts "----"
  categorized[:crew]
      .map { |name| [name, req_counts[name]] }
      .sort { |a, b| b[1] <=> a[1] }
      .each { |key, value| puts "#{value} #{key}" }

  puts
  puts "Systems"
  puts "-------"
  categorized[:system]
      .map { |name| [name, req_counts[name]] }
      .sort { |a, b| b[1] <=> a[1] }
      .each { |key, value| puts "#{value} #{key}" }

  puts
  puts "Uncategorized entities"
  puts categorized[nil].to_s
end

def count_events_in_file(filename)
  # hash of name to count
  req_counts = parse_file(filename)
      .css("choice[req]")
      .group_by { |c| c.attr("req") }
end

def count_events(filenames)
  # combine them all somehow
  filenames.map { |fn| count_events_in_file(fn) }
      .reduce { |totals, counts| totals.merge!(counts) { |key, a, b| a.concat(b) } }
      .transform_values(&:length)
end


def main
  puts "Read Augment blueprints:"
  puts AUGMENTS.to_s
  puts
  puts "Read Crew blueprints:"
  puts CREW.to_s
  puts
  puts "Read System blueprints:"
  puts SYSTEMS.to_s

  name_to_type = {}
  AUGMENTS.each { |aug| name_to_type[aug] = :augment }
  CREW.each { |crew| name_to_type[crew] = :crew }
  SYSTEMS.each { |sys| name_to_type[sys] = :system }

  # hash of name to count
  event_files = ["events*", "dlcEvents*"].flat_map { |pattern| Dir.glob("#{BASEPATH}#{pattern}") }
  req_counts = count_events(event_files)

      # add them together

  categorized = req_counts.keys.group_by { |name| name_to_type[name] }

  print_output(req_counts, categorized)
end

main
