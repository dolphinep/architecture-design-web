import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lessons, getLesson } from "@/lib/lessons";
import { SlidePlayer } from "@/components/learning/SlidePlayer";

export async function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} — Learning — arch.design`,
    description: lesson.description,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  return <SlidePlayer lesson={lesson} />;
}
