/**
 * Live scrap rates, categories and locations are loaded from MongoDB:
 * - GET /api/rates
 * - GET /api/categories
 * - GET /api/locations (admin-enabled locations only)
 */
export const NOT_ACCEPTED_MATERIALS = [
  "Thermocol",
  "Construction debris",
  "Ceramics",
  "Certain mixed or contaminated waste",
];
