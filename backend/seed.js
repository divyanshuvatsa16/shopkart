const mongoose = require("mongoose");
const Product = require("./models/product.model");

const sampleProducts = [
  {
    name: "Oscilloscope 100MHz Dual Channel",
    description: "High-precision 100MHz digital storage oscilloscope with 1GSa/s real-time sampling rate, 7-inch TFT color display, and dual analog channels.",
    price: 249,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    stock: 12,
  },
  {
    name: "Digital Multimeter TRMS 6000 Counts",
    description: "True-RMS digital multimeter with auto-ranging, NCV sensor, capacitance, temperature probe, and backlit LCD display.",
    price: 99,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
    stock: 25,
  },
  {
    name: "Soldering Station 60W ESD Safe",
    description: "Microprocessor-controlled 60W soldering station with PID temperature compensation, ceramic heating element, and ESD-safe grounding.",
    price: 99,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=800&q=80",
    stock: 18,
  },
  {
    name: "DC Bench Power Supply 30V 10A",
    description: "Variable switching DC power supply with 4-digit LED display, constant voltage/current modes, low ripple, and short-circuit protection.",
    price: 89,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    stock: 8,
  },
  {
    name: "Logic Analyzer 8-Channel USB",
    description: "Compact 24MHz 8-channel USB logic analyzer compatible with PulseView and Sigrok for decoding UART, I2C, SPI, and CAN protocols.",
    price: 89,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1517055729445-fa7d27394b48?auto=format&fit=crop&w=800&q=80",
    stock: 30,
  },
  {
    name: "ESD Anti-Static Lab Coat",
    description: "Conductive grid anti-static lab coat engineered for cleanrooms and static-sensitive hardware assembly benches. Breathable static dissipative fabric.",
    price: 99,
    category: "Fashion",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
    stock: 40,
  },
  {
    name: "Silicon Soldering Work Mat (Heat Resistant 500°C)",
    description: "High-grade heat insulation silicone desk pad with magnetic screw positioning slots, ruler markings, and parts compartments.",
    price: 899,
    category: "Home",
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
    stock: 50,
  },
  {
    name: "The Art of Electronics (3rd Edition)",
    description: "The definitive reference manual by Paul Horowitz and Winfield Hill covering analog and digital circuit design, components, and laboratory techniques.",
    price: 99,
    category: "Books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    stock: 15,
  },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/shopkart";
  try {
    await mongoose.connect(mongoUri);
    const result = await Product.bulkWrite(
      sampleProducts.map(({ name, description, price, category, image, stock }) => ({
        updateOne: {
          filter: { name },
          update: {
            $set: { description, price, category, image },
            $setOnInsert: { name, stock },
          },
          upsert: true,
        },
      }))
    );

    console.log(
      `Catalog synchronized: ${result.upsertedCount} products added, ` +
        `${result.modifiedCount} products updated. Existing stock was preserved.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((err) => {
  console.error("Catalog synchronization failed:", err.message);
  process.exitCode = 1;
});
