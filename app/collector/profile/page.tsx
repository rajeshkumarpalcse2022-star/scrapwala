"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, MapPin, Calendar, Shield, BadgeCheck } from "lucide-react";

interface CollectorProfile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  collectorId?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CollectorProfilePage() {
  const [profile, setProfile] = useState<CollectorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/collector/profile", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Unable to load profile.");
          return;
        }
        setProfile(data.data.collector as CollectorProfile);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        <div className="rounded-xl border bg-white p-6">
          <p className="text-sm text-destructive">{error || "Profile not found."}</p>
        </div>
      </div>
    );
  }

  const joinedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="max-w-3xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="bg-white rounded-xl border p-8 flex flex-col items-center mb-6">
        <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mb-4">
          {getInitials(profile.name)}
        </div>
        <h2 className="text-2xl font-bold">{profile.name}</h2>
        <p className="text-gray-500">{profile.collectorId}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{profile.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{profile.email || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Work Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BadgeCheck className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Collector ID</p>
                <p className="font-medium">{profile.collectorId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium capitalize">{profile.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      profile.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {profile.isActive ? "active" : "inactive"}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Joined Date</p>
                <p className="font-medium">{joinedDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
