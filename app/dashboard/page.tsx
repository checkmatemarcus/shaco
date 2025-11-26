"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  is_public: boolean;
  start_date: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(7);
  const [isPublic, setIsPublic] = useState(true);

  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 1) Hent innlogget bruker
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/login"); // sørg for at /login finnes etter hvert
        return;
      }
      setUserId(data.user.id);
      setLoadingUser(false);
    };
    getUser();
  }, [router]);

  // 2) Hent prosjekter for innlogget bruker
  useEffect(() => {
    if (!userId) return;

    const fetchProjects = async () => {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setMessage("Failed to load projects.");
      } else {
        setProjects((data as Project[]) || []);
      }
      setLoadingProjects(false);
    };

    fetchProjects();
  }, [userId]);

  // 3) Opprette nytt prosjekt
  const handleCreateProject = async () => {
    if (!userId) return;

    if (!title.trim()) {
      setMessage("Title is required.");
      return;
    }

    setCreating(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        title,
        description: description || null,
        duration_days: duration,
        is_public: isPublic,
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      setMessage(error.message);
      setCreating(false);
      return;
    }

    setProjects((prev) => [data as Project, ...prev]);
    setTitle("");
    setDescription("");
    setDuration(7);
    setIsPublic(true);
    setCreating(false);
    setMessage("Project created!");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loadingUser) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 underline"
        >
          Log out
        </button>
      </div>

      {/* Create project form */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="text-xl font-semibold">Create a new project</h2>

        <div>
          <label className="block mb-1 text-sm font-medium">Title</label>
          <input
            className="border rounded w-full p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 2-week healthy habits"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">Description</label>
          <textarea
            className="border rounded w-full p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description of your project"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">
            Duration (days)
          </label>
          <select
            className="border rounded w-full p-2"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={7}>1 week (7 days)</option>
            <option value={14}>2 weeks (14 days)</option>
            <option value={21}>3 weeks (21 days)</option>
            <option value={28}>4 weeks (28 days)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_public"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <label htmlFor="is_public" className="text-sm">
            Public project (visible to others)
          </label>
        </div>

        <button
          onClick={handleCreateProject}
          disabled={creating}
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create project"}
        </button>

        {message && (
          <p className="mt-2 text-sm text-red-600 whitespace-pre-line">
            {message}
          </p>
        )}
      </section>

      {/* Project list */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Your projects</h2>
        {loadingProjects ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-600">
            No projects yet. Create your first one above ✨
          </p>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{project.title}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-600">
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
    </div>
  );
}
