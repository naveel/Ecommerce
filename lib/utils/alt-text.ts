import { Category } from "@/lib/types";

interface AltTextInput {
  category: Category;
  dominantColors: string[];
  descriptors: string[];
}

export function buildAltText({ category, dominantColors, descriptors }: AltTextInput): string {
  const colorPhrase = dominantColors.length ? `${dominantColors.join(" and ")} ` : "";
  const descriptorPhrase = descriptors.length ? `${descriptors.join(" ")}` : "polished";
  const subject = category === "Jewelry" ? "accessory" : "garment";
  const surface = category === "Jewelry" ? "display bust" : "tailored mannequin";
  return `${capitalize(colorPhrase)}${descriptorPhrase} ${subject} showcased on a ${surface}`.trim();
}

function capitalize(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
