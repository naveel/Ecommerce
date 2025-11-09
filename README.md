# Model Product Compositor

A production-ready Next.js application for compositing product imagery onto mannequins or statues, delivering storefront-ready assets in seconds.

## Features

- Drag-and-drop upload zones for mannequin/model and product images (PNG, JPG, WebP up to 10 MB).
- Category-aware compositing for jewelry or clothing with adjustable jewelry scale tweak.
- Secure server-side processing via Next.js App Router and Sharp.
- Automated background cleanup, color balancing, and subtle shadowing on a neutral studio backdrop.
- Exports WEBP (lossless) and JPEG (quality 88) in 1:1 (2048×2048), 4:5 (2000×2500), and 3:4 (1800×2400) ratios.
- Inline before/after preview and responsive gallery with individual and ZIP downloads.
- Toast notifications, validation, accessibility-friendly controls, and responsive Tailwind UI.
- Light Vitest coverage for placement math and export validation.

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and drop in a model/mannequin photo and the product image, choose a category, optionally adjust the jewelry scale slider, then click **Process images**.

## Testing

```bash
npm test
```

## Known limitations

- Background cleanup uses heuristic thresholding and blur; intricate cutouts may require manual touch-ups.
- Placement heuristics assume centered mannequins and may need manual adjustments for atypical poses.
- Processing is performed in-memory per request and is not intended for high-volume batch jobs without further optimization.
