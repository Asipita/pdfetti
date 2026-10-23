# PDFetti design system

## Identity

PDFetti is precise, friendly, and trustworthy. “Fill it. Sign it. Download it. No catches.” Coral is the identity; neutral surfaces are the foundation.

## Tokens

All colors and radii live in `src/styles/theme.css`. Brand `#FF6B6B`, primary `#BE3144`, background `#FFFBFB`, foreground `#271F22`, border `#F1DDE0`, and workspace `#F4F4F5`. Components use semantic CSS variables. Future dark mode should remap semantic values rather than altering component CSS.

## Typography and spacing

Inter is the exclusive interface font, loaded through `next/font`. PDF content and user-selected annotation/signature lettering are exceptions. Body text uses 16px/1.6; support copy 14px/1.5; tool labels 13–14px. Use a 4px spacing rhythm. Prefer typography and spacing over decoration.

## Components

Buttons: primary, secondary, outline, ghost, destructive. Heights: 40px default, 32px compact, 36px icon. Inputs use 8px radii; dialogs 12px. Shadows are reserved for pages and dialogs. Hover, active, disabled, loading, and visible keyboard focus states are required.

## Experiences

Marketing pages may be expressive and spacious. The editor must be restrained and distraction-free. Both share one coherent design system. Coral should be used sparingly; neutral surfaces dominate the editor.

## Interaction and accessibility

Selected controls use both fill and shape/outline. Keyboard focus is visible. Dialogs return focus. Touch targets are at least 40px where space permits. Motion is brief and purposeful; reduced-motion disables it. Confetti appears only after a successful download.

## Avoid

Do not use generic AI-generated UI clichés: fake social proof, status pills, animated dots, decorative blobs, gradients, excessive cards or shadows, random icon boxes, or meaningless statistics.
