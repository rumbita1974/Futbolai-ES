"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/world-cup", label: "World Cup", icon: "🌎" },
    { href: "/teams", label: "Teams", icon: "👥" },
    { href: "/players", label: "Players", icon: "👤" },
    { href: "/highlights", label: "Highlights", icon: "🎥" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 md:hidden z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all flex-1 mx-1 ${
                isActive 
                  ? "text-white bg-gradient-to-r from-blue-600/30 to-green-500/30 border border-blue-500/30" 
                  : "text-gray-400 hover:text-white hover:bg-gray-800/30"
              }`}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}