// Locale-keyed display labels for Listings' fixed enums (listing_type,
// status, condition). Listings has no config.json (hand-built feature, not
// generator-driven) so this mirrors the options_<locale> pattern used by
// the other categories' config.json files, just expressed as plain JS
// objects instead of parallel arrays. Stored DB values are unaffected --
// this only changes what's displayed.

export const TYPE_LABELS = {
  giveaway: { en: 'Giveaway', it: 'Regalo', de: 'Verschenken', fr: 'Don', es: 'Regalo', pt: 'Doação', nl: 'Weggeven', da: 'Gratis', sv: 'Skänkes', no: 'Gis bort', sl: 'Podarim', sq: 'Dhurojë' },
  trade: { en: 'Trade', it: 'Scambio', de: 'Tausch', fr: 'Échange', es: 'Intercambio', pt: 'Troca', nl: 'Ruilen', da: 'Byt', sv: 'Byte', no: 'Bytte', sl: 'Menjava', sq: 'Shkëmbim' },
  sell: { en: 'Sell', it: 'Vendo', de: 'Verkaufen', fr: 'Vente', es: 'Venta', pt: 'Venda', nl: 'Verkopen', da: 'Sælges', sv: 'Säljes', no: 'Selges', sl: 'Prodam', sq: 'Shes' },
  rent: { en: 'Rent', it: 'Affitto', de: 'Vermietung', fr: 'Location', es: 'Alquiler', pt: 'Aluguel', nl: 'Verhuur', da: 'Udlejes', sv: 'Uthyres', no: 'Utleie', sl: 'Najem', sq: 'Qira' },
  iso: { en: 'ISO', it: 'Cerco', de: 'Suche', fr: 'Recherche', es: 'Busco', pt: 'Procuro', nl: 'Gezocht', da: 'Søges', sv: 'Sökes', no: 'Søkes', sl: 'Iščem', sq: 'Kërkoj' },
};

export const STATUS_LABELS = {
  fulfilled: { en: 'Fulfilled', it: 'Completato', de: 'Erfüllt', fr: 'Réalisé', es: 'Completado', pt: 'Concluído', nl: 'Voltooid', da: 'Opfyldt', sv: 'Uppfyllt', no: 'Oppfylt', sl: 'Izpolnjeno', sq: 'Përmbushur' },
  closed: { en: 'Closed', it: 'Chiuso', de: 'Geschlossen', fr: 'Fermé', es: 'Cerrado', pt: 'Fechado', nl: 'Gesloten', da: 'Lukket', sv: 'Stängd', no: 'Stengt', sl: 'Zaprto', sq: 'Mbyllur' },
};

// Short descriptions shown under each type option on the create/edit form
// (not shown on the detail/show page, so kept separate from TYPE_LABELS).
export const TYPE_DESCRIPTIONS = {
  giveaway: { en: 'Free to a good home', it: 'Gratis a chi lo apprezza', de: 'Kostenlos an gute Hände', fr: 'Gratuit pour qui en prendra soin', es: 'Gratis para quien lo aprecie', pt: 'Grátis para quem cuidar bem', nl: 'Gratis voor een goed thuis', da: 'Gratis til et godt hjem', sv: 'Gratis till ett gott hem', no: 'Gratis til et godt hjem', sl: 'Brezplačno za dober dom', sq: 'Falas për një shtëpi të mirë' },
  trade: { en: 'Exchange for something else', it: 'Scambio con qualcos\'altro', de: 'Tausch gegen etwas anderes', fr: 'Échange contre autre chose', es: 'Intercambio por otra cosa', pt: 'Troca por outra coisa', nl: 'Ruilen voor iets anders', da: 'Byttes for noget andet', sv: 'Byts mot något annat', no: 'Byttes mot noe annet', sl: 'Menjava za nekaj drugega', sq: 'Shkëmbim me diçka tjetër' },
  sell: { en: 'For sale at a price', it: 'In vendita a un prezzo', de: 'Zum Verkauf', fr: 'À vendre', es: 'En venta', pt: 'À venda', nl: 'Te koop', da: 'Til salg', sv: 'Till salu', no: 'Til salgs', sl: 'Naprodaj', sq: 'Në shitje' },
  rent: { en: 'Available to rent', it: 'Disponibile in affitto', de: 'Zu vermieten', fr: 'Disponible à la location', es: 'Disponible en alquiler', pt: 'Disponível para alugar', nl: 'Beschikbaar voor verhuur', da: 'Til udlejning', sv: 'Tillgänglig för uthyrning', no: 'Tilgjengelig for utleie', sl: 'Na voljo za najem', sq: 'I disponueshëm me qira' },
  iso: { en: 'In Search Of — looking to find', it: 'Cerco — sto cercando', de: 'Suche — auf der Suche nach', fr: 'Recherche — à la recherche de', es: 'Busco — estoy buscando', pt: 'Procuro — à procura de', nl: 'Gezocht — op zoek naar', da: 'Søges — leder efter', sv: 'Sökes — letar efter', no: 'Søkes — leter etter', sl: 'Iščem — v iskanju', sq: 'Kërkoj — në kërkim të' },
};

export const CONDITION_LABELS = {
  new_item: { en: 'New', it: 'Nuovo', de: 'Neu', fr: 'Neuf', es: 'Nuevo', pt: 'Novo', nl: 'Nieuw', da: 'Ny', sv: 'Ny', no: 'Ny', sl: 'Novo', sq: 'I ri' },
  like_new: { en: 'Like New', it: 'Come nuovo', de: 'Wie neu', fr: 'Comme neuf', es: 'Como nuevo', pt: 'Como novo', nl: 'Zo goed als nieuw', da: 'Som ny', sv: 'Som ny', no: 'Som ny', sl: 'Kot novo', sq: 'Si i ri' },
  used: { en: 'Used', it: 'Usato', de: 'Gebraucht', fr: 'Occasion', es: 'Usado', pt: 'Usado', nl: 'Gebruikt', da: 'Brugt', sv: 'Begagnad', no: 'Brukt', sl: 'Rabljeno', sq: 'I përdorur' },
  damaged: { en: 'Damaged', it: 'Danneggiato', de: 'Beschädigt', fr: 'Endommagé', es: 'Dañado', pt: 'Danificado', nl: 'Beschadigd', da: 'Beskadiget', sv: 'Skadad', no: 'Skadet', sl: 'Poškodovano', sq: 'I dëmtuar' },
};

// map: one of the exported label objects above. value: the stored DB
// string (e.g. 'sell', 'new_item'). Falls back: exact locale -> language
// -> English -> the raw stored value, same fallback chain as fieldLabel/
// optionLabel in translation_helpers.js.
export const listingOptionLabel = (map, value, locale) => {
  const lang = locale?.split('-')[0];
  const entry = map[value];
  if (!entry) return value;
  return entry[locale] || entry[lang] || entry.en || value;
};
