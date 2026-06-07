# frozen_string_literal: true

# Seed community locations (towns) for the miacivezza area —
# the Imperia province and nearby Ligurian coast.

MIACIVEZZA_TOWNS = [
  { name: 'Imperia',                 sort_order: 10 },
  { name: 'San Lorenzo al Mare',     sort_order: 20 },
  { name: 'Santo Stefano al Mare',   sort_order: 30 },
  { name: 'Riva Ligure',             sort_order: 40 },
  { name: 'Arma di Taggia',          sort_order: 50 },
  { name: 'Taggia',                  sort_order: 60 },
  { name: 'Sanremo',                 sort_order: 70 },
  { name: 'Bordighera',              sort_order: 80 },
  { name: 'Ventimiglia',             sort_order: 90 },
  { name: 'Diano Marina',            sort_order: 100 },
  { name: 'San Bartolomeo al Mare',  sort_order: 110 },
  { name: 'Cervo',                   sort_order: 120 },
  { name: 'Andora',                  sort_order: 130 },
  { name: 'Cipressa',                sort_order: 140 },
  { name: 'Castellaro',              sort_order: 150 },
].freeze

MIACIVEZZA_TOWNS.each do |attrs|
  CommunityLocation.find_or_initialize_by(name: attrs[:name]).tap do |loc|
    loc.sort_order = attrs[:sort_order]
    loc.active     = true
    loc.save!
  end
end

Rails.logger.info "Seeded #{MIACIVEZZA_TOWNS.size} community locations"
