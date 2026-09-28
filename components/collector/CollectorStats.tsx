interface CollectorStatsProps {
  assigned?: number;
  accepted?: number;
  inProgress?: number;
  completed?: number;
}

export default function CollectorStats({
  assigned = 0,
  accepted = 0,
  inProgress = 0,
  completed = 0,
}: CollectorStatsProps) {
  const stats = [
    { label: "Assigned", value: assigned, color: "bg-blue-50 text-blue-700", border: "border-blue-200" },
    { label: "Accepted", value: accepted, color: "bg-yellow-50 text-yellow-700", border: "border-yellow-200" },
    { label: "In Progress", value: inProgress, color: "bg-orange-50 text-orange-700", border: "border-orange-200" },
    { label: "Completed", value: completed, color: "bg-green-50 text-green-700", border: "border-green-200" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-xl border ${stat.border} ${stat.color} p-4`}
        >
          <p className="text-sm font-medium opacity-80">{stat.label}</p>
          <p className="mt-1 text-3xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
