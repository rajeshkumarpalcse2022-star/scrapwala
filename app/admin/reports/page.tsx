import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const metadata: Metadata = {
  title: "Reports & Analytics | ScrapWala Admin",
};

const dailyPickups = [
  { day: "Mon", value: 28 },
  { day: "Tue", value: 35 },
  { day: "Wed", value: 22 },
  { day: "Thu", value: 40 },
  { day: "Fri", value: 32 },
  { day: "Sat", value: 18 },
  { day: "Sun", value: 10 },
];

const weeklyRevenue = [
  { week: "Week 1", value: 42000 },
  { week: "Week 2", value: 55000 },
  { week: "Week 3", value: 38000 },
  { week: "Week 4", value: 48000 },
];

const scrapCategories = [
  { name: "Paper", percentage: 35, color: "bg-blue-500" },
  { name: "Plastic", percentage: 25, color: "bg-emerald-500" },
  { name: "Metals", percentage: 20, color: "bg-amber-500" },
  { name: "E-Waste", percentage: 15, color: "bg-purple-500" },
  { name: "Appliances", percentage: 5, color: "bg-rose-500" },
];

const collectorPerformance = [
  { name: "Amit Pal", completed: 210, rating: 4.9, rate: "97%" },
  { name: "Manoj Das", completed: 182, rating: 4.7, rate: "94%" },
  { name: "Rajesh Kumar", completed: 156, rating: 4.8, rate: "92%" },
  { name: "Subhash Ghosh", completed: 98, rating: 4.5, rate: "88%" },
];

const locationPerformance = [
  { name: "Kolkata", pickups: 156, revenue: 78000 },
  { name: "Howrah", pickups: 38, revenue: 19000 },
  { name: "Salt Lake", pickups: 42, revenue: 21000 },
  { name: "New Town", pickups: 35, revenue: 17500 },
  { name: "Durgapur", pickups: 14, revenue: 7000 },
];

const maxDailyPickups = Math.max(...dailyPickups.map((d) => d.value));
const maxWeeklyRevenue = Math.max(...weeklyRevenue.map((w) => w.value));

export default function AdminReportsPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Reports & Analytics"
        subtitle="Insights into ScrapWala operations."
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Pickup Overview</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-6 text-sm text-gray-500">
            Daily pickups for the last 7 days
          </p>
          <div className="flex items-end gap-3 h-48">
            {dailyPickups.map((d) => (
              <div
                key={d.day}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs font-medium text-gray-600">
                  {d.value}
                </span>
                <div
                  className="w-full rounded-t-md bg-emerald-500 transition-all"
                  style={{
                    height: `${(d.value / maxDailyPickups) * 100}%`,
                    minHeight: "4px",
                  }}
                />
                <span className="text-xs text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Revenue Overview
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-6 text-sm text-gray-500">Weekly revenue</p>
          <div className="flex items-end gap-6 h-48">
            {weeklyRevenue.map((w) => (
              <div
                key={w.week}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs font-medium text-gray-600">
                  ₹{(w.value / 1000).toFixed(0)}k
                </span>
                <div
                  className="w-full rounded-t-md bg-emerald-500 transition-all"
                  style={{
                    height: `${(w.value / maxWeeklyRevenue) * 100}%`,
                    minHeight: "4px",
                  }}
                />
                <span className="text-xs text-gray-500">{w.week}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Top Scrap Categories
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          {scrapCategories.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{cat.name}</span>
                <span className="text-gray-500">{cat.percentage}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${cat.color} transition-all`}
                  style={{ width: `${cat.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Collector Performance
        </h2>
        <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Collector
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Completed
                </th>
                <th className="px-4 py-3 font-medium text-gray-600">Rating</th>
                <th className="px-4 py-3 font-medium text-gray-600">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {collectorPerformance.map((c) => (
                <tr key={c.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.completed}</td>
                  <td className="px-4 py-3">
                    <span className="text-amber-500">
                      {"★".repeat(Math.round(c.rating))}
                    </span>
                    <span className="ml-1 text-gray-500">{c.rating}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 md:hidden">
          {collectorPerformance.map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-gray-200 bg-white p-4 space-y-2"
            >
              <h3 className="font-medium text-gray-900">{c.name}</h3>
              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                <div>
                  <span className="text-gray-400">Completed: </span>
                  {c.completed}
                </div>
                <div>
                  <span className="text-gray-400">Rating: </span>
                  {c.rating}
                </div>
                <div>
                  <span className="text-gray-400">Rate: </span>
                  {c.rate}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Location Performance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locationPerformance.map((loc) => (
            <div
              key={loc.name}
              className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
            >
              <h3 className="font-semibold text-gray-900">{loc.name}</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pickups</span>
                <span className="font-medium text-gray-900">{loc.pickups}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Revenue</span>
                <span className="font-medium text-gray-900">
                  ₹{loc.revenue.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${(loc.revenue / Math.max(...locationPerformance.map((l) => l.revenue))) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
