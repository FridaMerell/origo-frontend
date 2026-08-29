// Illustrative species list for the Tempus home cards. Kept in a plain module
// (no "use client") so it can be imported from the server component in
// `page.tsx` as well as from `Home.tsx` — importing data out of a client
// module yields a client-reference proxy, not the value.
export const species = [
  {
    name: "Citronfjäril",
    latin: "Gonepteryx rhamni",
    status: "Pågående",
    habitat: "Skogsbryn · trädgårdar · ängsmark",
    active: [3, 4, 5, 6, 7, 8],
    mapLandform: "field",
    mapBaseline: "agricultural",
    mapVariant: "open",
    mapFeature: undefined,
  },
  {
    name: "Ängsvädd",
    latin: "Succisa pratensis",
    status: "Pågående",
    habitat: "Fuktäng · betesmark · vägkant",
    active: [6, 7, 8, 9],
    mapLandform: "valley",
    mapBaseline: "wetland",
    mapVariant: "marsh-corridor",
    mapFeature: undefined,
  },
  {
    name: "Trattkantarell",
    latin: "Craterellus tubaeformis",
    status: "Börjar nu",
    habitat: "Mossig barrskog · fuktig mark",
    active: [7, 8, 9, 10],
    mapLandform: "hill",
    mapBaseline: "forest",
    mapVariant: "old-growth",
    mapFeature: "conifers",
  },
  {
    name: "Större korsnäbb",
    latin: "Loxia pytyopsittacus",
    status: "Börjar nu",
    habitat: "Tallskog · kustnära barrskog",
    active: [7, 8, 9, 10, 11],
    mapLandform: null,
    mapBaseline: "coastal",
    mapVariant: "sheltered-bay",
    mapFeature: undefined,
  },
] as const
