"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async () => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setMessage("Could not retrieve user after signup.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      username: username || email,
      display_name: username || email,
      bio: null,
    });

    if (profileError) {
      setMessage("User created, but profile failed to save.");
      setLoading(false);
      return;
    }

    setMessage("Success! Check your email for confirmation.");
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">Sign up</h1>

      <label className="block mb-2 text-sm font-medium">
        Username (optional)
      </label>
      <input
        className="border rounded w-full p-2 mb-4"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. yourname"
      />

      <label className="block mb-2 text-sm font-medium">Email</label>
      <input
        className="border rounded w-full p-2 mb-4"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className="block mb-2 text-sm font-medium">Password</label>
      <input
        className="border rounded w-full p-2 mb-4"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleSignup}
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 w-full disabled:opacity-60"
      >
        {loading ? "Signing up..." : "Sign up"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-red-600 whitespace-pre-line">
          {message}
        </p>
      )}
    </div>
  );
}
