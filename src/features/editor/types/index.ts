export type Tool = "select" | "text" | "signature" | "check" | "draw";
export type AnnotationBase = {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type TextAnnotation = AnnotationBase & {
  kind: "text";
  text: string;
  fontSize: number;
  color: string;
};
export type SignatureAnnotation = AnnotationBase & {
  kind: "signature";
  dataUrl: string;
};
export type CheckAnnotation = AnnotationBase & { kind: "check"; color: string };
export type DrawAnnotation = AnnotationBase & {
  kind: "draw";
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
};
export type Annotation =
  TextAnnotation | SignatureAnnotation | CheckAnnotation | DrawAnnotation;
export type FormValue = string | boolean;
