"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Innlogging vellykket!");
    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">Logg inn</h1>

      <label className="block mb-2 text-sm font-medium">E-post</label>
      <input
        className="border rounded w-full p-2 mb-4"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="din@email.no"
      />

      <label className="block mb-2 text-sm font-medium">Passord</label>
      <input
        className="border rounded w-full p-2 mb-4"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="passordet du valgte"
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 w-full disabled:opacity-60"
      >
        {loading ? "Logger inn..." : "Logg inn"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-red-600 whitespace-pre-line">
          {message}
        </p>
      )}
    </div>
  );
}
