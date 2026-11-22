// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// GitHub Pages serves the site from heleg.github.io/runpad/. Links in
// content are relative, Markdown links don't get `base` added.
export default defineConfig({
  site: "https://heleg.github.io",
  base: "/runpad",
  integrations: [
    starlight({
      title: "RunPad",
      // Light green in both themes, like the home page hero.
      logo: { src: "./src/assets/logo-dark.svg" },
      customCss: ["./src/styles/custom.css"],
      // Adds a Docs link next to the title, so the home page (no sidebar)
      // links to the docs too.
      components: {
        SiteTitle: "./src/components/SiteTitle.astro",
        // Smaller logo, the tagline line by line, an install snippet.
        Hero: "./src/components/Hero.astro",
        // Dark theme until the visitor picks another one.
        ThemeProvider: "./src/components/ThemeProvider.astro",
      },
      // Our own 404 page lives in content, Starlight's route would win.
      disable404Route: true,
      // Link previews can't follow the theme: the card is dark.
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://heleg.github.io/runpad/og.png",
          },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary_large_image" },
        },
      ],
      description:
        "Terminal UI for browsing and running package.json scripts in single packages and workspaces.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/heleg/runpad",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/heleg/runpad/edit/master/website/",
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            { label: "Getting started", slug: "guides/getting-started" },
            { label: "Using RunPad", slug: "guides/usage" },
            { label: "Configuration", slug: "guides/configuration" },
          ],
        },
      ],
    }),
  ],
});
