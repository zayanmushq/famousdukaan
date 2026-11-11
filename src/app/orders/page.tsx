"use client";

export default function OrdersPage() {
  const orders = [
    { id: "AET-10248", date: "Nov 9", total: 4360, status: "Shipped", assured: true },
    { id: "AET-10192", date: "Nov 5", total: 2480, status: "Delivered", assured: true },
    { id: "AET-10087", date: "Oct 28", total: 890, status: "Delivered", assured: false },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-light tracking-tight mb-2">My Orders</h1>
      <p className="text-neutral-500 mb-10">Track and manage your purchases</p>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-neutral-200 rounded-xl p-5 flex justify-between items-center">
            <div>
              <div className="font-medium">{order.id}</div>
              <div className="text-sm text-neutral-500">{order.date} · ₹{order.total.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              {order.assured && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Assured</span>}
              <span className={`text-sm ${order.status === "Delivered" ? "text-green-600" : "text-blue-600"}`}>
                {order.status}
              </span>
              <a href="/track" className="text-sm underline">Track</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}