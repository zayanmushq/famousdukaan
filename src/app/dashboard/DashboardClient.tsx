"use client";

export default function DashboardClient({ storeName, vendorStatus }: { storeName?: string | null; vendorStatus?: string | null }) {
  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">Vendor Dashboard</h1>
      <p className="text-neutral-500 mb-4">{storeName || "Your store"} · Store management</p>
      {vendorStatus === "PENDING" && (
        <div className="mb-10 p-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl text-sm">
          Your seller account is pending approval. You can explore the dashboard, but publishing products will be available after an admin approves your store.
        </div>
      )}
      {vendorStatus !== "PENDING" && <div className="mb-10" />}

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 border border-neutral-200 rounded-xl">
          <div className="text-sm text-neutral-500">Total Sales</div>
          <div className="mt-2 text-2xl font-light">$4,280</div>
          <div className="text-xs text-green-600 mt-1">+12% this month</div>
        </div>
        <div className="p-6 border border-neutral-200 rounded-xl">
          <div className="text-sm text-neutral-500">Your Earnings</div>
          <div className="mt-2 text-2xl font-light">$3,852</div>
          <div className="text-xs text-neutral-500 mt-1">After 10% commission</div>
        </div>
        <div className="p-6 border border-neutral-200 rounded-xl">
          <div className="text-sm text-neutral-500">Pending Payout</div>
          <div className="mt-2 text-2xl font-light">$1,240</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="border border-neutral-200 rounded-xl p-6">
          <h3 className="font-medium mb-4">Recent Orders</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span>#AET-1024 · Minimal Leather Tote</span>
              <span className="text-neutral-500">Processing</span>
            </div>
            <div className="flex justify-between">
              <span>#AET-1021 · Merino Wool Scarf</span>
              <span className="text-neutral-500">Shipped</span>
            </div>
            <div className="flex justify-between">
              <span>#AET-1018 · Leather Wallet</span>
              <span className="text-green-600">Delivered</span>
            </div>
          </div>
        </div>

        <div className="border border-neutral-200 rounded-xl p-6">
          <h3 className="font-medium mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm">
              + Add New Product
            </button>
            <button className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm">
              Manage Inventory
            </button>
            <button className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm">
              Request Payout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}