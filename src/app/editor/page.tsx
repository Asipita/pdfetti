import type { Metadata } from "next";
import { Editor } from "@/features/editor/components/editor";
export const metadata: Metadata = {
  title: "Editor",
  description: "Edit, fill, sign, and download a PDF in your browser.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/editor/" },
};
export default function EditorPage() {
  return <Editor />;
}
