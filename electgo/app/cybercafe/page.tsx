"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { FaHome, FaPrint, FaWifi, FaFileAlt, FaLaptop, FaClock } from "react-icons/fa";

export default function CyberCafePage() {
  // Cafe services with icons
  const cafeServices = [
    {
      id: 1,
      name: "Printing Services",
      description: "High-quality color and B&W printing",
      icon: <FaPrint className="text-4xl text-indigo-600 mb-3" />,
      url: "/printing"
    },
    {
      id: 2,
      name: "Internet Access",
      description: "High-speed internet packages",
      icon: <FaWifi className="text-4xl text-indigo-600 mb-3" />,
      url: "/internet"
    },
    {
      id: 3,
      name: "Scanning Services",
      description: "Document scanning and digitization",
      icon: <FaFileAlt className="text-4xl text-indigo-600 mb-3" />,
      url: "/scanning"
    }
  ];

  // E-Government services with images (using correct file names from /public)
  const egovServices = [
    {
      id: 4,
      name: "KRA iTax",
      description: "Tax registration and filing",
      image: "/itax.png",
      url: "/kra"
    },
    {
      id: 5,
      name: "eCitizen",
      description: "Government services portal",
      image: "/ecitizen.png",
      url: "/ecitizen"
    },
    {
      id: 6,
      name: "NTSA Services",
      description: "Driving licenses & vehicle registration",
      image: "/ntsa.png",
      url: "/ntsa"
    },
    {
      id: 7,
      name: "Social Health Authority (SHA)",
      description: "Universal health coverage and services",
      image: "/sha.png",
      url: "/sha.gov.ke"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Home button */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-600 flex items-center">
            <FaLaptop className="mr-3 text-amber-600" />
            Cyber Cafe Management
          </h1>
          <Link href="/">ok 
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
            >
              <FaHome className="mr-2" />
              Return Home
            </motion.button>
          </Link>
        </header>

        {/* Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cafe Services with Icons */}
          {cafeServices.map((service) => (
            <motion.div
              key={service.id}
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
              className="bg-white rounded-xl overflow-hidden shadow-lg p-6 text-center"
            >
              <div className="flex justify-center mb-4">
                {service.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{service.name}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <Link href={service.url}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
                >
                  Access Service
                </motion.button>
              </Link>
            </motion.div>
          ))}

          {/* E-Government Services with Images */}
          {egovServices.map((service) => (
            <motion.div
              key={service.id}
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
              className="bg-white rounded-xl overflow-hidden shadow-lg"
            >
              <div className="h-40 relative bg-gray-100 flex items-center justify-center">
                <Image
                  src={service.image}
                  alt={service.name}
                  width={120}
                  height={80}
                  className="object-contain"
                />
              </div>
              <div className="p-5 text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{service.name}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <Link href={service.url}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
                  >
                    Access Service
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Computer Stations Section */}
        <div className="mt-12 bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <FaClock className="mr-2 text-indigo-600" />
            Computer Stations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((station) => (
              <div key={station} className="border border-gray-200 rounded-lg p-4 text-center">
                <div className="w-16 h-16 mx-auto bg-gray-200 border-2 border-dashed rounded-xl mb-2" />
                <h3 className="font-medium">Station {station}</h3>
                <p className="text-sm text-green-600">Available</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}