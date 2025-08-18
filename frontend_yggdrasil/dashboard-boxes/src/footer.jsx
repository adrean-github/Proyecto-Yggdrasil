import React from "react";
import { Heart, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#005C48] text-white mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10">
        
        {/* Sección superior */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-green-700 pb-6">
          <p className="text-sm">
            © {new Date().getFullYear()} <span className="font-semibold">Yggdrasil</span> - Hospital Padre Hurtado
          </p>

          <div className="mt-4 sm:mt-0 flex space-x-4">
            <Link
              to="/login"
              className="flex items-center gap-1 text-sm hover:text-green-200 transition-colors"
            >
              <LogIn size={16} /> Login
            </Link>
          </div>
        </div>

        {/* Sección inferior */}
        <div className="mt-6 text-center text-xs text-gray-200 flex justify-center items-center gap-1">
          Desarrollado con <Heart size={14} className="text-red-400" /> por{" "}
          <span className="font-semibold">Elytra</span>
        </div>

        <div className="mt-6 text-center text-xs text-gray-200 flex justify-center items-center gap-1">
          Adrean Torres Fonseca - Ariel Van Kilsdonk
        </div>
      </div>
    </footer>
  );
}
