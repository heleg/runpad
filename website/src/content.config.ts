import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { defineCollection } from "astro:content";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // No translations: `i18n/en.json` is empty, it only keeps Starlight from
  // warning about a missing collection on every build.
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
