export type AdminPickupStatus =
  | "scheduled"
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "weighing"
  | "payment_pending"
  | "completed"
  | "cancelled";

export type AdminPaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type AdminPaymentMethod = "cash" | "upi" | "bank_transfer";
export type AdminCollectorStatus = "available" | "on_pickup" | "offline";
export type AdminCustomerStatus = "active" | "inactive";
export type AdminLocationStatus = "active" | "inactive";
export type AdminTimeSlotStatus = "active" | "inactive";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalPickups: number;
  completedPickups: number;
  cancelledPickups: number;
  totalEarned: number;
  joinedDate: string;
  status: AdminCustomerStatus;
  address: string;
  city: string;
}

export interface AdminCollector {
  id: string;
  name: string;
  phone: string;
  email: string;
  area: string;
  todayPickups: number;
  completedToday: number;
  totalCompleted: number;
  status: AdminCollectorStatus;
  joinedDate: string;
  rating: number;
}

export interface AdminPickup {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  date: string;
  time: string;
  collectorId?: string;
  collectorName?: string;
  categories: string[];
  estimatedQuantity: string;
  estimatedAmount: string;
  finalAmount?: number;
  status: AdminPickupStatus;
  paymentStatus?: AdminPaymentStatus;
  paymentMethod?: AdminPaymentMethod;
}

export interface AdminLocation {
  id: string;
  name: string;
  city: string;
  state: string;
  pinCodes: string;
  status: AdminLocationStatus;
  collectorsAvailable?: number;
  serviceRadius?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  updatedAt: string;
}

export interface AdminTimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  status: AdminTimeSlotStatus;
}

export interface AdminPayment {
  id: string;
  pickupId: string;
  customerName: string;
  amount: number;
  method: AdminPaymentMethod;
  date: string;
  status: AdminPaymentStatus;
}

export interface AdminTransaction {
  id: string;
  pickupId: string;
  customerName: string;
  collectorName: string;
  amount: number;
  type: "pickup_payment" | "refund" | "adjustment";
  method: AdminPaymentMethod;
  status: AdminPaymentStatus;
  date: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "pickup" | "payment" | "collector" | "system";
}

export interface AdminStats {
  totalPickups: number;
  pendingPickups: number;
  completedPickups: number;
  activeCollectors: number;
  totalCustomers: number;
  todayRevenue: number;
}

export type PickupStatus = AdminPickupStatus;

export const PICKUP_STATUS_LABELS: Record<AdminPickupStatus, string> = {
  scheduled: "Scheduled",
  assigned: "Assigned",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  weighing: "Weighing",
  payment_pending: "Payment Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PICKUP_STATUS_COLORS: Record<AdminPickupStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  assigned: "bg-indigo-100 text-indigo-700",
  accepted: "bg-yellow-100 text-yellow-700",
  on_the_way: "bg-purple-100 text-purple-700",
  arrived: "bg-orange-100 text-orange-700",
  weighing: "bg-amber-100 text-amber-700",
  payment_pending: "bg-rose-100 text-rose-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export const PAYMENT_STATUS_LABELS: Record<AdminPaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_COLORS: Record<AdminPaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-700",
};

export const COLLECTOR_STATUS_LABELS: Record<AdminCollectorStatus, string> = {
  available: "Available",
  on_pickup: "On Pickup",
  offline: "Offline",
};

export const COLLECTOR_STATUS_COLORS: Record<AdminCollectorStatus, string> = {
  available: "bg-emerald-100 text-emerald-700",
  on_pickup: "bg-blue-100 text-blue-700",
  offline: "bg-gray-100 text-gray-700",
};
