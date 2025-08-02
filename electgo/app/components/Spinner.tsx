import { FaSpinner } from "react-icons/fa";

export default function Spinner() {
  return (
    <div className="flex justify-center items-center">
      <FaSpinner className="animate-spin text-xl" />
    </div>
  );
} 