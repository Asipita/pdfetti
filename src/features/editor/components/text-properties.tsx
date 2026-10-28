"use client";
import { useEffect, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Check, ChevronDown, Italic } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import type { TextAnnotation, TextFormatting } from "../types";
import {
  documentFonts,
  getDocumentFont,
  resolveTextFormatting,
  supportsFontStyle,
} from "@/features/fonts/registry";

const colors = ["#271f22", "#BE3144", "#1F5A82", "#2F6B4F"];

export function TextProperties({
  annotation,
  onUpdate,
}: {
  annotation: TextAnnotation;
  onUpdate: (patch: Partial<TextFormatting>) => void;
}) {
  const format = resolveTextFormatting(annotation);
  const font = getDocumentFont(format.fontId);
  const [sizeInput, setSizeInput] = useState(String(format.fontSize));
  useEffect(() => setSizeInput(String(format.fontSize)), [format.fontSize, annotation.id]);
  function commitSize(value: string) {
    const size = Number(value);
    if (!Number.isFinite(size)) {
      setSizeInput(String(format.fontSize));
      return;
    }
    const clamped = Math.max(6, Math.min(144, size));
    setSizeInput(String(clamped));
    onUpdate({ fontSize: clamped });
  }
  return (
    <div className="text-properties" role="group" aria-label="Text formatting">
      <div className="font-family-control">
        <span>Font</span>
        <Select.Root
          value={font.id}
          onValueChange={(value) => {
            const next = getDocumentFont(value);
            onUpdate({
              fontId: next.id,
              bold: format.bold && supportsFontStyle(next, "bold"),
              italic: format.italic && supportsFontStyle(next, "italic"),
            });
          }}
        >
          <Select.Trigger className="font-select-trigger" aria-label="Document font">
            <Select.Value>{font.name}</Select.Value>
            <Select.Icon><ChevronDown size={13} /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="font-select-content" position="popper" sideOffset={5} align="start">
              <Select.Viewport>
                {(["Professional", "Handwriting"] as const).map((category) => (
                  <Select.Group key={category}>
                    <Select.Label className="font-select-group">{category}</Select.Label>
                    {documentFonts.filter((entry) => entry.category === category).map((entry) => (
                      <Select.Item className="font-select-item" key={entry.id} value={entry.id}>
                        <span className="font-select-sample" style={{ fontFamily: `"${entry.cssFamily}"` }}>Aa</span>
                        <Select.ItemText>{entry.name}</Select.ItemText>
                        <Select.ItemIndicator className="font-select-check"><Check size={14} /></Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Group>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
      <span
        className="font-preview"
        aria-hidden="true"
        style={{ fontFamily: `"${font.cssFamily}"` }}
      >
        Aa
      </span>
      <label className="font-size-control">
        <span>Size</span>
        <input
          aria-label="Font size"
          type="number"
          min="6"
          max="144"
          value={sizeInput}
          onChange={(e) => {
            setSizeInput(e.target.value);
            const size = Number(e.target.value);
            if (e.target.value && size >= 6 && size <= 144)
              onUpdate({ fontSize: size });
          }}
          onBlur={(e) => commitSize(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </label>
      <div className="text-property-buttons" role="group" aria-label="Font style">
        <button
          type="button" aria-label="Bold" aria-pressed={format.bold}
          title="Bold" disabled={!supportsFontStyle(font, "bold")}
          className={format.bold ? "active" : ""}
          onClick={() => onUpdate({ bold: !format.bold })}
        >
          <Bold size={15} />
        </button>
        <button
          type="button" aria-label="Italic" aria-pressed={format.italic}
          title="Italic" disabled={!supportsFontStyle(font, "italic")}
          className={format.italic ? "active" : ""}
          onClick={() => onUpdate({ italic: !format.italic })}
        >
          <Italic size={15} />
        </button>
      </div>
      <div className="text-property-colors" role="group" aria-label="Text color">
        {colors.map((value) => (
          <button
            type="button" key={value}
            aria-label={value === colors[0] ? "Black text" : `Text color ${value}`}
            aria-pressed={format.color.toLowerCase() === value.toLowerCase()}
            title={value}
            className={format.color.toLowerCase() === value.toLowerCase() ? "active" : ""}
            style={{ "--swatch": value } as React.CSSProperties}
            onClick={() => onUpdate({ color: value })}
          />
        ))}
        <input
          type="color"
          aria-label="Custom text color"
          title="Custom text color"
          value={format.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
        />
      </div>
      <div className="text-property-buttons" role="group" aria-label="Text alignment">
        {([
          ["left", AlignLeft],
          ["center", AlignCenter],
          ["right", AlignRight],
        ] as const).map(([align, Icon]) => (
          <button
            type="button" key={align}
            aria-label={`Align ${align}`}
            aria-pressed={format.align === align}
            title={`Align ${align}`}
            className={format.align === align ? "active" : ""}
            onClick={() => onUpdate({ align })}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <label className="line-height-control">
        <span>Line</span>
        <select
          aria-label="Line height"
          value={format.lineHeight}
          onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
        >
          {[1, 1.15, 1.25, 1.5, 2].map((value) => (
            <option key={value} value={value}>{value.toFixed(2)}×</option>
          ))}
        </select>
      </label>
    </div>
  );
}
