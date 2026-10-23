"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileUp, LockKeyhole } from "lucide-react";
import { savePendingFile, validateFile } from "@/features/pdf/session";
import { Button } from "@/components/ui/button";
export function UploadArea() {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  async function pick(file?: File) {
    if (!file) return;
    const issue = validateFile(file);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await savePendingFile(file);
      router.push("/editor/");
    } catch {
      setError("Your browser could not open this file. Try again.");
      setBusy(false);
    }
  }
  return (
    <div
      className={`upload-area ${over ? "upload-area--over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void pick(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        aria-label="Choose a PDF"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="upload-icon">
        <FileUp size={25} strokeWidth={1.7} />
      </div>
      <div>
        <strong>Drop your PDF here</strong>
        <p>or choose a file to start editing</p>
      </div>
      <Button onClick={() => input.current?.click()} loading={busy}>
        Choose a PDF <ArrowUpRight size={17} />
      </Button>
      <p className="upload-foot">
        <LockKeyhole size={14} /> Your file stays in your browser. Up to 50 MB.
      </p>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
