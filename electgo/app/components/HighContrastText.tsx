export default function HighContrastText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-gray-900 font-medium dark:text-gray-100">
      {children}
    </span>
  );
} 