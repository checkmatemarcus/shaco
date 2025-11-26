"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProjectWithProfile = {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  is_public: boolean;
  created_at: string;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
};

export default function ExplorePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          id,
          title,
          description,
          duration_days,
          is_public,
          created_at,
          profiles (
            id,
            username,
            display_name
          )
        `
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setMessage("Failed to load public projects.");
      } else {
        setProjects((data as ProjectWithProfile[]) || []);
      }

      setLoading(false);
    };

    fetchProjects();
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Explore public projects</h1>
      <p className="text-sm text-gray-600">
        See what other people are doing in their 1–4 week projects.
      </p>

      {loading ? (
        <p>Loading...</p>
      ) : message ? (
        <p className="text-sm text-red-600">{message}</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-600">
          No public projects yet. Be the first one! 🚀
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
                  <h2 className="font-semibold">{project.title}</h2>
                  {project.description && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  {project.profiles && (
                    <p className="text-xs text-gray-500 mt-1">
                      by{" "}
                      {project.profiles.display_name ||
                        project.profiles.username ||
                        "Anonymous"}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {project.duration_days} days
                  <br />
                  Public
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
