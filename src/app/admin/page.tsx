"use client";

import { useState } from "react";

const mockVendors = [
  { id: "v1", name: "Atelier Noir", products: 12, sales: 18420, commission: 1842, status: "Active" },
  { id: "v2", name: "Form Studio", products: 8, sales: 12180, commission: 1461, status: "Active" },
  { id: "v3", name: "Lumen", products: 5, sales: 9650, commission: 965, status: "Pending" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">Admin Panel</h1>
      <p className="text-neutral-500 mb-10">Marketplace control center</p>

      <div className="flex gap-2 mb-10 border-b border-neutral-200">
        {["overview", "vendors", "orders", "settings"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${
              tab === t ? "border-b-2 border-neutral-900 font-medium" : "text-neutral-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Total GMV</div>
            <div className="mt-2 text-2xl font-light">$128,450</div>
          </div>
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Platform Commission</div>
            <div className="mt-2 text-2xl font-light">$12,845</div>
          </div>
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Active Vendors</div>
            <div className="mt-2 text-2xl font-light">42</div>
          </div>
          <div className="p-6 border border-neutral-200 rounded-xl">
            <div className="text-sm text-neutral-500">Pending Approvals</div>
            <div className="mt-2 text-2xl font-light">3</div>
          </div>
        </div>
      )}

      {tab === "vendors" && (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left p-4 font-medium">Vendor</th>
                <th className="text-left p-4 font-medium">Products</th>
                <th className="text-left p-4 font-medium">Sales</th>
                <th className="text-left p-4 font-medium">Commission</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockVendors.map((v) => (
                <tr key={v.id} className="border-t border-neutral-100">
                  <td className="p-4 font-medium">{v.name}</td>
                  <td className="p-4">{v.products}</td>
                  <td className="p-4">${v.sales.toLocaleString()}</td>
                  <td className="p-4">${v.commission.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${v.status === "Active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-xs underline">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-md space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Default Commission Rate (%)</label>
            <input type="number" defaultValue={10} className="w-full px-4 py-2 border border-neutral-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Payout Amount</label>
            <input type="number" defaultValue={50} className="w-full px-4 py-2 border border-neutral-200 rounded-lg" />
          </div>
          <button className="px-6 py-2.5 bg-neutral-900 text-white text-sm rounded-full">Save Settings</button>
        </div>
      )}
    </div>
  );
}