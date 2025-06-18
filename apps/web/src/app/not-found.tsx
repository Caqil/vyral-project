"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function NotFound() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const navigateHome = () => {
    router.push("/");
  };

  const navigateBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* 404 Number with glow effect */}
        <div className="relative mb-8">
          <h1
            className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 select-none transition-all duration-300"
            style={{
              textShadow: isHovering
                ? "0 0 50px rgba(147, 51, 234, 0.5)"
                : "0 0 30px rgba(147, 51, 234, 0.3)",
              transform: isHovering ? "scale(1.05)" : "scale(1)",
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            404
          </h1>

          {/* Glitch effect overlay */}
          <div className="absolute inset-0 text-9xl md:text-[12rem] font-bold text-red-500 opacity-0 animate-ping select-none pointer-events-none">
            404
          </div>
        </div>

        {/* Title */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in-up">
          Oops! Page Not Found
        </h2>

        {/* Description */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-300">
          The page you're looking for seems to have vanished into the digital
          void. Don't worry, even the best explorers sometimes take a wrong
          turn.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up animation-delay-600">
          <button
            onClick={navigateHome}
            className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="w-5 h-5 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go Home
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>

          <button
            onClick={navigateBack}
            className="group px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/10 transform hover:scale-105"
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Go Back
            </span>
          </button>
        </div>

        {/* Fun interactive element */}
        <div className="mt-16 animate-fade-in-up animation-delay-900">
          <p className="text-gray-400 mb-4">
            Lost? Try moving your mouse around!
          </p>
          <div
            className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mx-auto transition-all duration-150 ease-out"
            style={{
              transform: `translate(${(mousePosition.x - window.innerWidth / 2) * 0.02}px, ${(mousePosition.y - window.innerHeight / 2) * 0.02}px)`,
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .animation-delay-300 {
          animation-delay: 0.3s;
          opacity: 0;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
          opacity: 0;
        }

        .animation-delay-900 {
          animation-delay: 0.9s;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
