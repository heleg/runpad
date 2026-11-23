// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLlmsTxt from "starlight-llms-txt";

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
      // llms.txt, llms-full.txt and llms-small.txt for AI assistants, built
      // from the same pages as the site.
      plugins: [
        starlightLlmsTxt({
          details: [
            "- RunPad is a CLI (`rp`, or `runpad`) installed from npm as `@heleg/runpad`.",
            "- Its optional team config is `runpad.config.yaml`, `.yml` or `.json` in the workspace root; the JSON Schema is at https://unpkg.com/@heleg/runpad/schema.json.",
            "- Favorites and the last run script are personal and live outside the project.",
          ].join("\n"),
          optionalLinks: [
            {
              label: "Source on GitHub",
              url: "https://github.com/heleg/runpad",
            },
            {
              label: "Package on npm",
              url: "https://www.npmjs.com/package/@heleg/runpad",
            },
          ],
          // Pages in menu order. `exclude` only applies to llms-small.txt;
          // llms-full.txt takes every page, so 404 goes last there.
          promote: [
            "index*",
            "guides/getting-started",
            "guides/usage",
            "guides/configuration",
          ],
          demote: ["404"],
          exclude: ["404"],
          // Collapsing whitespace turns the keys and marks tables into one
          // line in llms-small.txt.
          minify: { whitespace: false },
        }),
      ],
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
