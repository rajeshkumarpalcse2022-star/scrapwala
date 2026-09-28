export interface PublicRateView {
  id: string;
  subcategoryId: string;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  minRate: number;
  maxRate: number;
  unit: string;
}
