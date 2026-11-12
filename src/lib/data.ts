export const products = [
  {
    id: "1",
    name: "Minimal Leather Tote",
    price: 23559,
    stock: 20,
    vendor: "Atelier Noir",
    vendorId: "v1",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
    category: "Bags",
    rating: 0,
    reviews: 0,
    fastDelivery: true,
    offers: [
      { vendor: "Atelier Noir", vendorId: "v1", price: 23559, rating: 4.9, delivery: "2-3 days" },
      { vendor: "Leather Co.", vendorId: "v5", price: 24609, rating: 4.6, delivery: "4-5 days" },
    ],
  },
  {
    id: "2",
    name: "Ceramic Pour-Over Set",
    price: 8169,
    stock: 20,
    vendor: "Form Studio",
    vendorId: "v2",
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80",
    category: "Home",
    rating: 0,
    reviews: 0,
    fastDelivery: true,
    offers: [
      { vendor: "Form Studio", vendorId: "v2", price: 8169, rating: 4.9, delivery: "1-2 days" },
    ],
  },
  {
    id: "3",
    name: "Merino Wool Scarf",
    price: 11399,
    stock: 20,
    vendor: "Atelier Noir",
    vendorId: "v1",
    image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80",
    category: "Apparel",
    rating: 0,
    reviews: 0,
    fastDelivery: false,
    offers: [
      { vendor: "Atelier Noir", vendorId: "v1", price: 11399, rating: 4.7, delivery: "3-4 days" },
    ],
  },
  {
    id: "4",
    name: "Brass Desk Lamp",
    price: 30399,
    stock: 20,
    vendor: "Lumen",
    vendorId: "v3",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80",
    category: "Lighting",
    rating: 0,
    reviews: 0,
    fastDelivery: true,
    offers: [
      { vendor: "Lumen", vendorId: "v3", price: 30399, rating: 4.6, delivery: "2 days" },
      { vendor: "Light Works", vendorId: "v6", price: 31829, rating: 4.4, delivery: "5 days" },
    ],
  },
  {
    id: "5",
    name: "Linen Throw Pillow",
    price: 6459,
    stock: 20,
    vendor: "Form Studio",
    vendorId: "v2",
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80",
    category: "Home",
    rating: 0,
    reviews: 0,
    fastDelivery: true,
    offers: [
      { vendor: "Form Studio", vendorId: "v2", price: 6459, rating: 4.5, delivery: "1-2 days" },
    ],
  },
  {
    id: "6",
    name: "Handcrafted Watch",
    price: 84549,
    stock: 20,
    vendor: "Chronos",
    vendorId: "v4",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
    category: "Accessories",
    rating: 0,
    reviews: 0,
    fastDelivery: false,
    offers: [
      { vendor: "Chronos", vendorId: "v4", price: 84549, rating: 4.9, delivery: "5-7 days" },
    ],
  },
];

export const vendors = [
  { id: "v1", name: "Atelier Noir", description: "Timeless leather goods", rating: 0, products: 42 },
  { id: "v2", name: "Form Studio", description: "Thoughtful home objects", rating: 0, products: 28 },
  { id: "v3", name: "Lumen", description: "Architectural lighting", rating: 0, products: 15 },
  { id: "v4", name: "Chronos", description: "Precision timepieces", rating: 0, products: 8 },
];

export const reviews = {
  "1": [
    { name: "Elena M.", rating: 5, comment: "Exceptional quality. The leather ages beautifully." },
    { name: "James K.", rating: 4, comment: "Minimal and functional. Exactly as described." },
  ],
  "2": [
    { name: "Sofia L.", rating: 5, comment: "The pour-over process feels meditative with this set." },
  ],
};

export const recommended = ["2", "5", "3"];