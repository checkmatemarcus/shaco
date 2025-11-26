"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  created_at: string;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  is_public: boolean;
  created_at: string;
};

export default function MePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessage(null);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const userId = userData.user.id;

      const [{ data: prof, error: profError }, { data: projs, error: projError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("projects")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
        ]);

      if (profError) {
        console.error(profError);
        setMessage("Failed to load profile.");
      } else {
        setProfile(prof as Profile | null);
      }

      if (projError) {
        console.error(projError);
        setMessage("Failed to load projects.");
      } else {
        setProjects((projs as Project[]) || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-6">No profile found.</div>;
  }

  const name = profile.display_name || profile.username || "Unnamed user";

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">{name}</h1>
        {profile.username && (
          <p className="text-sm text-gray-500">@{profile.username}</p>
        )}
        {profile.bio && <p className="text-gray-700">{profile.bio}</p>}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Your projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-600">
            You don&apos;t have any projects yet. Create one in the dashboard ✨
          </p>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{project.title}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    {project.duration_days} days
                    <br />
                    {project.is_public ? "Public" : "Private"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {message && (
        <p className="text-sm text-red-600 whitespace-pre-line">{message}</p>
      )}
    </div>
  );
}
