"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Generate stars logic
const generateStars = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [stars, setStars] = useState<{ id: number; x: number; y: number; duration: number; delay: number }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    setStars(generateStars(50));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden flex items-center justify-center font-sans">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() > 0.6 ? "3px" : Math.random() > 0.3 ? "2px" : "1px",
              height: Math.random() > 0.6 ? "3px" : Math.random() > 0.3 ? "2px" : "1px",
              left: `${star.x}%`,
              top: `${star.y}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              boxShadow: `0 0 ${Math.random() * 15 + 8}px rgba(255,255,255,${Math.random() * 0.9 + 0.3})`,
            }}
          />
        ))}
      </div>

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-25 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-3xl opacity-25 animate-pulse" />
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />

      <div className="relative z-10 w-full max-w-md px-8">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2 font-sans">ClauseAI</h1>
            <p className="text-gray-400 text-sm">Legal Navigator for the Modern Era</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-cyan-400/20"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                className="bg-white/10 border-white/20 text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="bg-white/10 border-white/20 text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-cyan-400/20"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
            >
              {isLoading ? "Entering Cosmos..." : (isLogin ? "Launch to Dashboard" : "Create Account")}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setFormData({ name: "", email: "", password: "" });
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
            </button>
          </div>

          {/* <p className="text-center text-xs text-gray-500 mt-6">Security powered by the stars</p> */}
        </div>
      </div>

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
