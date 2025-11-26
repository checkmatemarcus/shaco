"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  duration_days: number;
  is_public: boolean;
  start_date: string;
  created_at: string;
};

type Entry = {
  id: string;
  project_id: string;
  day_number: number;
  content: string;
  created_at: string;
  image_url: string | null;
};

type CommentProfile = {
  display_name: string | null;
  username: string | null;
};

type Comment = {
  id: string;
  entry_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: CommentProfile | null;
};

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [entryText, setEntryText] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const selectedEntry =
    selectedDay !== null
      ? entries.find((e) => e.day_number === selectedDay) ?? null
      : null;

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Hent innlogget bruker
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    getUser();
  }, []);

  // Hent prosjekt + entries
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessage(null);

      // Hent prosjekt
      const { data: proj, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projError || !proj) {
        console.error(projError);
        setMessage("Could not load project.");
        setLoading(false);
        return;
      }

      setProject(proj as Project);

      // Hent entries for prosjektet
      const { data: ent, error: entError } = await supabase
        .from("entries")
        .select("*")
        .eq("project_id", projectId)
        .order("day_number", { ascending: true });

      if (entError) {
        console.error(entError);
        setMessage("Could not load entries.");
      } else {
        setEntries((ent as Entry[]) || []);
      }

      setLoading(false);
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const isOwner =
    userId !== null && project !== null && project.user_id === userId;

  const completedDays = entries.length;
  const totalDays = project?.duration_days ?? 0;
  const progressPercent =
    totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const handleSelectDay = (day: number) => {
    if (!project) return;
    if (day < 1 || day > project.duration_days) return;

    setSelectedDay(day);
    const existing = entries.find((e) => e.day_number === day);
    setEntryText(existing ? existing.content : "");
    setMessage(null);
  };

  const handleSaveEntry = async () => {
    if (!project || !selectedDay || !isOwner) {
      if (!isOwner) {
        setMessage("Only the project owner can edit entries.");
      }
      return;
    }

    if (!entryText.trim()) {
      setMessage("Entry text cannot be empty.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const existing = entries.find((e) => e.day_number === selectedDay);

    if (existing) {
      // Oppdater eksisterende entry
      const { data, error } = await supabase
        .from("entries")
        .update({ content: entryText })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error || !data) {
        console.error(error);
        setMessage("Failed to update entry.");
        setSaving(false);
        return;
      }

      setEntries((prev) =>
        prev.map((e) => (e.id === existing.id ? (data as Entry) : e))
      );
      setMessage("Entry updated!");
    } else {
      // Opprett ny entry
      const { data, error } = await supabase
        .from("entries")
        .insert({
          project_id: project.id,
          day_number: selectedDay,
          content: entryText,
        })
        .select("*")
        .single();

      if (error || !data) {
        console.error(error);
        setMessage("Failed to create entry.");
        setSaving(false);
        return;
      }

      setEntries((prev) =>
        [...prev, data as Entry].sort((a, b) => a.day_number - b.day_number)
      );
      setMessage("Entry created!");
    }

    setSaving(false);
  };

  // 📸 Håndter bilde-opplasting til Supabase Storage
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!project || !selectedDay || !isOwner) return;

    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage(null);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${project.id}/${selectedDay}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("entry-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        setMessage("Failed to upload image.");
        setUploadingImage(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("entry-images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const existing = entries.find((e) => e.day_number === selectedDay);

      if (existing) {
        const { data, error } = await supabase
          .from("entries")
          .update({ image_url: publicUrl })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (error || !data) {
          console.error(error);
          setMessage("Failed to save image URL.");
          setUploadingImage(false);
          return;
        }

        setEntries((prev) =>
          prev.map((e) => (e.id === existing.id ? (data as Entry) : e))
        );
      } else {
        const { data, error } = await supabase
          .from("entries")
          .insert({
            project_id: project.id,
            day_number: selectedDay,
            content: entryText || "",
            image_url: publicUrl,
          })
          .select("*")
          .single();

        if (error || !data) {
          console.error(error);
          setMessage("Failed to create entry with image.");
          setUploadingImage(false);
          return;
        }

        setEntries((prev) =>
          [...prev, data as Entry].sort(
            (a, b) => a.day_number - b.day_number
          )
        );
      }

      setMessage("Image uploaded!");
    } finally {
      setUploadingImage(false);
    }
  };

  // 💬 Hent kommentarer for valgt entry
  useEffect(() => {
    const fetchComments = async () => {
      if (!selectedEntry) {
        setComments([]);
        return;
      }

      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          id,
          entry_id,
          user_id,
          content,
          created_at,
          profiles (
            display_name,
            username
          )
        `
        )
        .eq("entry_id", selectedEntry.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        return;
      }

      setComments((data as Comment[]) || []);
    };

    fetchComments();
  }, [selectedEntry?.id]);

  const handleSaveComment = async () => {
    if (!selectedEntry || !userId) {
      setMessage("You must be logged in and have an entry to comment.");
      return;
    }

    if (!commentText.trim()) return;

    setSavingComment(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({
        entry_id: selectedEntry.id,
        user_id: userId,
        content: commentText.trim(),
      })
      .select(
        `
        id,
        entry_id,
        user_id,
        content,
        created_at,
        profiles (
          display_name,
          username
        )
      `
      )
      .single();

    if (error || !data) {
      console.error(error);
      setMessage("Failed to post comment.");
      setSavingComment(false);
      return;
    }

    setComments((prev) => [...prev, data as Comment]);
    setCommentText("");
    setSavingComment(false);
  };

  if (loading || !project) {
    return <div className="p-6">Loading project...</div>;
  }

  const canShowComments = !!selectedEntry;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <button
        className="text-sm text-blue-600 underline"
        onClick={() => router.push("/dashboard")}
      >
        ← Back to dashboard
      </button>

      {/* Project header */}
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">{project.title}</h1>
        {project.description && (
          <p className="text-gray-700">{project.description}</p>
        )}
        <p className="text-sm text-gray-500">
          Duration: {project.duration_days} days ·{" "}
          {project.is_public ? "Public" : "Private"}
        </p>
      </section>

      {/* Progress */}
      <section className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            Progress: {completedDays}/{totalDays} days ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="h-full bg-blue-600 rounded"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {/* Days grid */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Days</h2>
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
          {Array.from({ length: project.duration_days }).map((_, idx) => {
            const day = idx + 1;
            const hasEntry = entries.some((e) => e.day_number === day);
            const isSelected = selectedDay === day;

            const baseClasses =
              "border rounded-lg px-3 py-3 flex flex-col items-center justify-center min-h-[64px] transition";
            const colorClasses = isSelected
              ? "bg-blue-600 text-white border-blue-700"
              : hasEntry
              ? "bg-blue-50 text-blue-900 border-blue-400"
              : "bg-white text-gray-800 border-gray-300";

            return (
              <button
                key={day}
                onClick={() => handleSelectDay(day)}
                className={`${baseClasses} ${colorClasses}`}
              >
                <span className="text-base font-semibold">Day {day}</span>
                {hasEntry && (
                  <span className="text-xs mt-1 opacity-80">
                    {isOwner ? "Written" : "Entry"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Editor / view for selected day */}
      <section className="space-y-3 border rounded p-4">
        <h2 className="text-lg font-semibold">Daily entry</h2>

        {selectedDay === null ? (
          <p className="text-sm text-gray-600">
            Select a day above to view or write an entry.
          </p>
        ) : !isOwner ? (
          selectedEntry ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Viewing day {selectedDay} of {project.duration_days}
              </p>

              {selectedEntry.image_url && (
                <div className="mb-3">
                  <img
                    src={selectedEntry.image_url}
                    alt={`Day ${selectedDay} image`}
                    className="max-h-64 rounded border"
                  />
                </div>
              )}

              <div className="whitespace-pre-wrap text-gray-800 text-sm border rounded p-3 bg-gray-50">
                {selectedEntry.content}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              No entry has been written for this day yet.
            </p>
          )
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Editing day {selectedDay} of {project.duration_days}
            </p>

            {/* Bildevisning hvis det finnes */}
            {selectedEntry?.image_url && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Attached image:</p>
                <img
                  src={selectedEntry.image_url}
                  alt={`Day {selectedDay} image`}
                  className="max-h-64 rounded border"
                />
              </div>
            )}

            {/* File input for bilde */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploadingImage}
                className="text-sm"
              />
              {uploadingImage && (
                <p className="text-xs text-gray-500 mt-1">Uploading...</p>
              )}
            </div>

            <textarea
              className="border rounded w-full p-2 min-h-[120px]"
              value={entryText}
              onChange={(e) => setEntryText(e.target.value)}
              placeholder="How did this day go? What did you do or feel?"
            />
            <button
              onClick={handleSaveEntry}
              disabled={saving}
              className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save entry"}
            </button>
          </>
        )}

        {/* Comments */}
        {canShowComments && (
          <section className="space-y-2 mt-6">
            <h3 className="text-sm font-semibold">Comments</h3>

            {comments.length === 0 ? (
              <p className="text-xs text-gray-500">
                No comments yet. Be the first to say something.
              </p>
            ) : (
              <ul className="space-y-2">
                {comments.map((c) => {
                  const name =
                    c.profiles?.display_name ||
                    c.profiles?.username ||
                    "User";
                  return (
                    <li
                      key={c.id}
                      className="border rounded p-2 bg-gray-50"
                    >
                      <p className="text-xs text-gray-500 mb-1">
                        {name}
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            {userId ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="border rounded w-full p-2 text-sm"
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                />
                <button
                  onClick={handleSaveComment}
                  disabled={savingComment || !commentText.trim()}
                  className="text-xs px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                >
                  {savingComment ? "Posting..." : "Post comment"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-2">
                Log in to write a comment.
              </p>
            )}
          </section>
        )}

        {message && (
          <p className="mt-2 text-sm text-red-600 whitespace-pre-line">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
