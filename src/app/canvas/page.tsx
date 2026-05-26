import type { Metadata } from "next";
import CanvasWrapper from "@/components/canvas/CanvasWrapper";

export const metadata: Metadata = {
  title: "Canvas — arch.design",
  description: "Draw your own architecture diagrams with pre-built architecture shapes and templates.",
};

export default function CanvasPage() {
  return <CanvasWrapper />;
}
