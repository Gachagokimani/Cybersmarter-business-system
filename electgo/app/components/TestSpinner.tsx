"use client";
import { useState } from "react";
import Spinner from "./Spinner";

export default function TestSpinner() {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="p-8">
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setLoading(!loading)}
      >
        {loading ? <Spinner /> : "Toggle Spinner"}
      </button>
      <p className="mt-4">
        Spinner should {loading ? "be visible" : "be hidden"}
      </p>
    </div>
  );
} 