export const LOCATIONS = [
  "Kolkata",
  "Howrah",
  "Salt Lake",
  "New Town",
  "Kalyani",
  "Durgapur",
] as const;

export type Location = (typeof LOCATIONS)[number];

/**
 * Live scrap rates, categories and subcategories are loaded from MongoDB:
 * - GET /api/rates
 * - GET /api/categories
 */
export const NOT_ACCEPTED_MATERIALS = [
  "Thermocol",
  "Construction debris",
  "Ceramics",
  "Certain mixed or contaminated waste",
];
