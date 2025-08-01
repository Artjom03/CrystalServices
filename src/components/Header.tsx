"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white fixed w-full top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Crystal Services
          </Link>
          
          {/* Contact Info */}
          <div className="hidden lg:flex items-center space-x-6 text-sm text-gray-600">
            <span>✉️ info@crystal-services.be</span>
            <span>📞 0494 40 38 41</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Startpagina
            </Link>
            <Link 
              href="/over-ons"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Over ons
            </Link>
            <Link 
              href="/contact"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Contact
            </Link>
            <Link 
              href="/mijn-was-ophalen"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Mijn was ophalen
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex flex-col space-y-1"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="w-6 h-0.5 bg-gray-700 block"></span>
            <span className="w-6 h-0.5 bg-gray-700 block"></span>
            <span className="w-6 h-0.5 bg-gray-700 block"></span>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/"
                className="text-gray-700 hover:text-blue-600 transition-colors text-left"
                onClick={() => setIsMenuOpen(false)}
              >
                Startpagina
              </Link>
              <Link 
                href="/over-ons"
                className="text-gray-700 hover:text-blue-600 transition-colors text-left"
                onClick={() => setIsMenuOpen(false)}
              >
                Over ons
              </Link>
              <Link 
                href="/contact"
                className="text-gray-700 hover:text-blue-600 transition-colors text-left"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              <Link 
                href="/mijn-was-ophalen"
                className="text-gray-700 hover:text-blue-600 transition-colors text-left"
                onClick={() => setIsMenuOpen(false)}
              >
                Mijn was ophalen
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
