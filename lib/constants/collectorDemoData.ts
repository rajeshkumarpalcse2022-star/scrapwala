export type PickupStatus =
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "weighing"
  | "payment_pending"
  | "completed"
  | "cancelled";

export type PaymentMethod = "cash" | "upi" | "other";

export type CollectorStatus = "online" | "offline";

export interface Collector {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceArea: string;
  status: CollectorStatus;
  joinedDate: string;
}

export interface MaterialEntry {
  id: string;
  material: string;
  weight: number;
  unit: "kg";
  ratePerKg: number;
}

export interface Pickup {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  date: string;
  time: string;
  categories: string[];
  estimatedQuantity: string;
  estimatedValue: string;
  notes?: string;
  status: PickupStatus;
  materials?: MaterialEntry[];
  finalAmount?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: "pending" | "paid";
  completedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  pickupId?: string;
}

export const collector: Collector = {
  id: "COL-0001",
  name: "Rahul Das",
  phone: "+91 XXXXX XXXXX",
  email: "collector@scrapwala.demo",
  serviceArea: "Kolkata",
  status: "online",
  joinedDate: "2025-01-15",
};

export const todayPickups: Pickup[] = [
  {
    id: "SW-10245",
    customerName: "Amit Sharma",
    customerPhone: "+91 98XXX XXXXX",
    address: "Sector V, Salt Lake",
    city: "Kolkata",
    date: "2026-09-19",
    time: "10:30 AM",
    categories: ["Paper", "Cardboard"],
    estimatedQuantity: "25 kg",
    estimatedValue: "₹250–₹320",
    notes: "Old newspapers and cardboard boxes from office",
    status: "assigned",
  },
  {
    id: "SW-10246",
    customerName: "Priya Das",
    customerPhone: "+91 97XXX XXXXX",
    address: "Plot 12, New Town",
    city: "Kolkata",
    date: "2026-09-19",
    time: "12:00 PM",
    categories: ["E-Waste"],
    estimatedQuantity: "4 items",
    estimatedValue: "₹800–₹2000",
    notes: "Old laptop and printer",
    status: "accepted",
  },
  {
    id: "SW-10247",
    customerName: "Suman Ghosh",
    customerPhone: "+91 96XXX XXXXX",
    address: "45 Park Street",
    city: "Kolkata",
    date: "2026-09-19",
    time: "02:30 PM",
    categories: ["Metals"],
    estimatedQuantity: "15 kg",
    estimatedValue: "₹500–₹700",
    status: "on_the_way",
  },
  {
    id: "SW-10248",
    customerName: "Rina Mondal",
    customerPhone: "+91 95XXX XXXXX",
    address: "78 EM Bypass",
    city: "Kolkata",
    date: "2026-09-19",
    time: "04:00 PM",
    categories: ["Plastic"],
    estimatedQuantity: "10 kg",
    estimatedValue: "₹80–₹120",
    status: "arrived",
  },
  {
    id: "SW-10249",
    customerName: "Debasis Roy",
    customerPhone: "+91 94XXX XXXXX",
    address: "22 Gariahat Road",
    city: "Kolkata",
    date: "2026-09-19",
    time: "05:30 PM",
    categories: ["Appliances"],
    estimatedQuantity: "2 units",
    estimatedValue: "₹600–₹1200",
    notes: "Old fan and microwave",
    status: "weighing",
  },
];

export const upcomingPickups: Pickup[] = [
  {
    id: "SW-10250",
    customerName: "Arjun Banerjee",
    customerPhone: "+91 93XXX XXXXX",
    address: "15 Salt Lake Sector II",
    city: "Kolkata",
    date: "2026-09-20",
    time: "09:00 AM",
    categories: ["Paper", "Plastic"],
    estimatedQuantity: "20 kg",
    estimatedValue: "₹200–₹280",
    status: "assigned",
  },
  {
    id: "SW-10251",
    customerName: "Nandini Saha",
    customerPhone: "+91 92XXX XXXXX",
    address: "33 Lake Gardens",
    city: "Kolkata",
    date: "2026-09-20",
    time: "11:00 AM",
    categories: ["Metals", "E-Waste"],
    estimatedQuantity: "12 kg + 2 items",
    estimatedValue: "₹1000–₹1800",
    status: "assigned",
  },
  {
    id: "SW-10252",
    customerName: "Prosenjit Pal",
    customerPhone: "+91 91XXX XXXXX",
    address:  "8 Ballygunge Place",
    city: "Kolkata",
    date: "2026-09-20",
    time: "03:00 PM",
    categories: ["Vehicle Scrap"],
    estimatedQuantity: "1 unit",
    estimatedValue: "₹3000–₹8000",
    notes: "Old bike",
    status: "assigned",
  },
];

export const completedPickups: Pickup[] = [
  {
    id: "SW-10240",
    customerName: "Sanjay Gupta",
    customerPhone: "+91 90XXX XXXXX",
    address: "56 Dum Dum Road",
    city: "Kolkata",
    date: "2026-09-18",
    time: "10:00 AM",
    categories: ["Paper"],
    estimatedQuantity: "18 kg",
    estimatedValue: "₹198–₹234",
    status: "completed",
    materials: [
      { id: "m1", material: "Newspaper", weight: 12, unit: "kg", ratePerKg: 12 },
      { id: "m2", material: "Cardboard", weight: 6, unit: "kg", ratePerKg: 8 },
    ],
    finalAmount: 192,
    paymentMethod: "cash",
    paymentStatus: "paid",
    completedAt: "2026-09-18 11:15 AM",
  },
  {
    id: "SW-10241",
    customerName: "Moumita Sen",
    customerPhone: "+91 89XXX XXXXX",
    address: "90 Rajarhat",
    city: "Kolkata",
    date: "2026-09-18",
    time: "02:00 PM",
    categories: ["E-Waste"],
    estimatedQuantity: "3 items",
    estimatedValue: "₹600–₹1500",
    status: "completed",
    materials: [
      { id: "m3", material: "Laptop", weight: 1, unit: "kg", ratePerKg: 800 },
      { id: "m4", material: "Printer", weight: 2, unit: "kg", ratePerKg: 400 },
    ],
    finalAmount: 1600,
    paymentMethod: "upi",
    paymentStatus: "paid",
    completedAt: "2026-09-18 03:20 PM",
  },
  {
    id: "SW-10242",
    customerName: "Subhash Das",
    customerPhone: "+91 88XXX XXXXX",
    address: "12 Belgharia",
    city: "Kolkata",
    date: "2026-09-17",
    time: "11:00 AM",
    categories: ["Metals"],
    estimatedQuantity: "30 kg",
    estimatedValue: "₹900–₹1200",
    status: "completed",
    materials: [
      { id: "m5", material: "Iron", weight: 20, unit: "kg", ratePerKg: 22 },
      { id: "m6", material: "Steel", weight: 10, unit: "kg", ratePerKg: 38 },
    ],
    finalAmount: 820,
    paymentMethod: "cash",
    paymentStatus: "paid",
    completedAt: "2026-09-17 12:30 PM",
  },
  {
    id: "SW-10243",
    customerName: "Kajal Bhattacharya",
    customerPhone: "+91 87XXX XXXXX",
    address: "45 Maniktala",
    city: "Kolkata",
    date: "2026-09-17",
    time: "04:00 PM",
    categories: ["Plastic"],
    estimatedQuantity: "8 kg",
    estimatedValue: "₹56–₹64",
    status: "completed",
    materials: [
      { id: "m7", material: "PET Bottles", weight: 5, unit: "kg", ratePerKg: 10 },
      { id: "m8", material: "Mixed Plastic", weight: 3, unit: "kg", ratePerKg: 7 },
    ],
    finalAmount: 71,
    paymentMethod: "cash",
    paymentStatus: "paid",
    completedAt: "2026-09-17 05:00 PM",
  },
  {
    id: "SW-10244",
    customerName: "Anupam Chatterjee",
    customerPhone: "+91 86XXX XXXXX",
    address: "67 Southern Avenue",
    city: "Kolkata",
    date: "2026-09-16",
    time: "10:30 AM",
    categories: ["Appliances"],
    estimatedQuantity: "1 unit",
    estimatedValue: "₹800–₹2500",
    status: "completed",
    materials: [
      { id: "m9", material: "Washing Machine", weight: 1, unit: "kg", ratePerKg: 1200 },
    ],
    finalAmount: 1200,
    paymentMethod: "upi",
    paymentStatus: "paid",
    completedAt: "2026-09-16 12:00 PM",
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "New pickup assigned",
    message: "Pickup SW-10245 has been assigned to you for 10:30 AM.",
    time: "8:30 AM",
    read: false,
    pickupId: "SW-10245",
  },
  {
    id: "n2",
    title: "Pickup accepted",
    message: "You accepted pickup SW-10246 from Priya Das.",
    time: "9:15 AM",
    read: false,
    pickupId: "SW-10246",
  },
  {
    id: "n3",
    title: "Pickup completed",
    message: "Pickup SW-10240 has been marked as completed.",
    time: "Yesterday",
    read: true,
    pickupId: "SW-10240",
  },
  {
    id: "n4",
    title: "Payment received",
    message: "Payment of ₹192 received for pickup SW-10240.",
    time: "Yesterday",
    read: true,
    pickupId: "SW-10240",
  },
  {
    id: "n5",
    title: "New pickup assigned",
    message: "Pickup SW-10247 has been assigned to you for 2:30 PM.",
    time: "Yesterday",
    read: true,
    pickupId: "SW-10247",
  },
];

export const STATUS_LABELS: Record<PickupStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  weighing: "Weighing",
  payment_pending: "Payment Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<PickupStatus, string> = {
  assigned: "bg-blue-100 text-blue-700",
  accepted: "bg-yellow-100 text-yellow-700",
  on_the_way: "bg-indigo-100 text-indigo-700",
  arrived: "bg-purple-100 text-purple-700",
  weighing: "bg-orange-100 text-orange-700",
  payment_pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export const RATE_DEMO: Record<string, number> = {
  Newspaper: 12,
  "Office Paper": 12,
  Books: 11,
  Cardboard: 8,
  Plastic: 7,
  "PET Bottles": 10,
  Iron: 22,
  Steel: 38,
  Aluminium: 100,
  Copper: 450,
  Brass: 290,
  Laptop: 800,
  Printer: 400,
  Monitor: 500,
  "LED TV": 1200,
  Refrigerator: 2000,
  "Washing Machine": 1200,
  Microwave: 600,
  Fan: 350,
};
