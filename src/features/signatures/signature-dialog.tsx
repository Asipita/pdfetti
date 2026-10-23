"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { PenLine, Type, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SignatureDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInsert: (url: string) => void;
}) {
  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);
  const pad = useRef<SignaturePad | null>(null);
  const [tab, setTab] = useState<"draw" | "type" | "upload">("draw");
  const [typed, setTyped] = useState("");
  const [uploaded, setUploaded] = useState<string | null>(null);
  useEffect(() => {
    if (!open || tab !== "draw" || !canvasNode) return;
    const c = canvasNode;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.current?.toData();
      c.width = c.offsetWidth * ratio;
      c.height = c.offsetHeight * ratio;
      c.getContext("2d")?.scale(ratio, ratio);
      pad.current?.clear();
      if (data?.length) pad.current?.fromData(data);
    };
    pad.current = new SignaturePad(c, {
      minWidth: 1,
      maxWidth: 2.5,
      penColor: "#271f22",
      backgroundColor: "rgba(0,0,0,0)",
    });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      pad.current?.off();
      pad.current = null;
    };
  }, [open, tab, canvasNode]);
  function submit() {
    let url = "";
    if (tab === "draw") {
      if (!pad.current || pad.current.isEmpty()) return;
      url = pad.current.toDataURL("image/png");
    } else if (tab === "upload") {
      if (!uploaded) return;
      url = uploaded;
    } else {
      if (!typed.trim()) return;
      const c = document.createElement("canvas");
      c.width = 900;
      c.height = 240;
      const ctx = c.getContext("2d")!;
      ctx.font = "italic 76px cursive";
      ctx.fillStyle = "#271f22";
      ctx.fillText(typed.trim(), 25, 140, 850);
      url = c.toDataURL("image/png");
    }
    onInsert(url);
    onOpenChange(false);
  }
  function handleUpload(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      return;
    const reader = new FileReader();
    reader.onload = () => setUploaded(String(reader.result));
    reader.readAsDataURL(file);
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="signature-dialog">
          <div className="dialog-heading">
            <div>
              <Dialog.Title>Create a signature</Dialog.Title>
              <Dialog.Description>
                Choose how you’d like to sign. You can reuse it on this
                document.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X size={18} />
              </Button>
            </Dialog.Close>
          </div>
          <div
            className="signature-tabs"
            role="tablist"
            aria-label="Signature method"
          >
            <button
              className={tab === "draw" ? "active" : ""}
              onClick={() => setTab("draw")}
              role="tab"
              aria-selected={tab === "draw"}
            >
              <PenLine size={16} /> Draw
            </button>
            <button
              className={tab === "type" ? "active" : ""}
              onClick={() => setTab("type")}
              role="tab"
              aria-selected={tab === "type"}
            >
              <Type size={16} /> Type
            </button>
            <button
              className={tab === "upload" ? "active" : ""}
              onClick={() => setTab("upload")}
              role="tab"
              aria-selected={tab === "upload"}
            >
              <Upload size={16} /> Upload
            </button>
          </div>
          {tab === "draw" ? (
            <div className="signature-pad">
              <canvas ref={setCanvasNode} aria-label="Draw your signature" />
              <div className="pad-line" />
              <button onClick={() => pad.current?.clear()}>Clear</button>
            </div>
          ) : tab === "type" ? (
            <div className="signature-type">
              <label htmlFor="typed-signature">Your name</label>
              <input
                id="typed-signature"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Type your name"
                maxLength={40}
              />
              <div className="typed-preview" aria-label="Signature preview">
                {typed || "Your signature"}
              </div>
            </div>
          ) : (
            <div className="signature-upload">
              <label htmlFor="signature-image">
                Choose a PNG or JPEG image, up to 5 MB
              </label>
              <input
                id="signature-image"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
              {uploaded && (
                <img src={uploaded} alt="Uploaded signature preview" />
              )}
            </div>
          )}
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Use signature</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
