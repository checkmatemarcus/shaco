"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SimpleUser = {
  email?: string | null;
};

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sjekk auth + lytt etter endringer
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setCheckingAuth(false);
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  const mainLinks = user
    ? [
        { href: "/", label: "Home" },
        { href: "/explore", label: "Explore" },
        { href: "/dashboard", label: "Dashboard" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/explore", label: "Explore" },
      ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Første bokstav til avatar (fra e-post), fallback "S"
  const avatarInitial =
    (user?.email && user.email[0]?.toUpperCase()) || "S";

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b z-20">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-lg">
          Shaco
        </Link>

        <div className="flex items-center gap-6 text-sm">
          {/* Linker til venstre */}
          <div className="flex gap-4">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "hover:text-blue-600" +
                  (isActive(link.href)
                    ? " font-semibold text-blue-600"
                    : " text-gray-700")
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth-knapper */}
          {!checkingAuth && !user && (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className={
                  "text-sm hover:text-blue-600" +
                  (isActive("/login")
                    ? " font-semibold text-blue-600"
                    : " text-gray-700")
                }
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </div>
          )}

          {!checkingAuth && user && (
            <div className="flex items-center gap-3">
              {/* Avatar → /me */}
              <button
                onClick={() => router.push("/me")}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold hover:bg-blue-700"
                aria-label="Go to profile"
              >
                {avatarInitial}
              </button>

              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
