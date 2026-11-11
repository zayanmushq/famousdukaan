export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="text-lg font-semibold">FamousDukaan</div>
            <p className="mt-2 text-sm text-neutral-500 max-w-xs">
              Every shop, famous shop.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <div className="font-medium mb-3">Marketplace</div>
              <div className="space-y-2 text-neutral-500">
                <div>Shop</div>
                <div>Vendors</div>
                <div>Become a Seller</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-3">Company</div>
              <div className="space-y-2 text-neutral-500">
                <div>About</div>
                <div>Contact</div>
                <div>Privacy</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-neutral-100 text-xs text-neutral-400">
          © {new Date().getFullYear()} FamousDukaan. All rights reserved. White-label ready.
        </div>
      </div>
    </footer>
  );
}