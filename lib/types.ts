export type Category = "Jewelry" | "Clothing";

export type ProcessedImage = {
  sizeKey: "1x1" | "4x5" | "3x4";
  dimensions: { width: number; height: number };
  jpeg: string;
  webp: string;
  filenames: { jpeg: string; webp: string };
  altText: string;
};

export type ProcessResponse = {
  results: ProcessedImage[];
  zipBase64: string;
};
