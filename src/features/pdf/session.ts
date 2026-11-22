const DB = "pdfetti-session";
const STORE = "documents";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function savePendingFile(file: File) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, "pending");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function takePendingFile(): Promise<File | null> {
  const db = await openDB();
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).get("pending");
    req.onsuccess = () => {
      tx.objectStore(STORE).delete("pending");
      resolve(req.result || null);
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return file;
}
export const documentAccept = ".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isWordFile(file: File) {
  return /\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export function validateEditorFile(file: File): string | null {
  if (isWordFile(file)) {
    if (!file.size) return "This file is empty.";
    if (file.size > 50 * 1024 * 1024) return "Choose a Word document under 50 MB.";
    return null;
  }
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return "Choose a PDF or Word (.docx) file.";
  return validateFile(file);
}

export function validateFile(file: File): string | null {
  if (
    !file.name.toLowerCase().endsWith(".pdf") &&
    file.type !== "application/pdf"
  )
    return "Choose a PDF file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > 50 * 1024 * 1024)
    return "For reliable browser editing, choose a PDF under 50 MB.";
  return null;
}
