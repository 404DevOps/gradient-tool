# Gradient Texture Tool

A small app for building the multi-color gradient stripe textures used to texture
**low-poly 3D models** — no complicated unwrapping workflow required.

![Example texture output](docs/images/example-texture.png)

## What it's for

A popular low-poly modeling workflow (popularized by artists like
[Imphenzia](https://www.youtube.com/@Imphenzia) and [Kay Lousberg (aka. Kay Kits)](https://www.youtube.com/@KayLousberg))
skips UV unwrapping almost entirely: instead of laying out UVs for every face, you build one
small texture made of flat color gradients, apply it to the whole model, then just make uv islands and nudge each
to sample whichever stripe (and however light or dark a point on it) you
want that face to be. One tiny texture, no unwrapping, and a clean low-poly look.

This tool makes that source texture. Define as many gradients as you like, tweak their colors
and fades, and export a PNG sized and laid out exactly how you need it.

## Features

- **Gradient list** — any number of gradients, each with its own start/end color and fade,
  drag-and-drop reordering, and a master slider to adjust every fade at once.
- **Full color picker** — HSL and RGB modes, a 2D color square, a hue strip, and a hex field on
  every swatch.
- **Bring in colors from anywhere** — paste a palette from [coolors.co](https://coolors.co),
  pick from a library of 500 curated palettes, or pull colors straight out of a photo.
- **Match Colors** — nudge a set of gradients so they read as a cohesive palette in one click.
- **Live preview** as you edit.
- **Save as a PNG** — your exact gradient setup travels with the file, so reopening it later
  picks up right where you left off.
- Runs as a **standalone desktop app** or in **any browser** — same tool, either way.

## How to use it

1. Click **+ Add gradient** (or bring in colors from a palette, the library, or an image) to
   build up a list of gradients.
2. Adjust each one's start color, end color, and fade width until the preview looks right.
3. Drag to reorder, and pick a texture size and grid dimensions from the top bar.
4. Hit **Save as...** to export the PNG — it can be reopened later (via Import) to recreate this
   exact setup.
5. In Blender, apply the PNG as your model's texture, then set each face's UVs to sample the
   stripe (and vertical position within it) you want for that face.

## Running it

- **Standalone app:** double-click `GradientTextureTool.exe` — no browser needed.
- **In your browser:** double-click `start-in-browser.bat`.

Both launch the exact same app. See [Developer Notes](docs/developer-notes.md) for the project
layout, file formats, and how to rebuild the standalone app after making changes.

## Inspiration

This project was inspired by
["Make Low Poly Models Look AMAZING With This Simple Gradient Trick!"](https://www.youtube.com/watch?v=9ITJgW9hVrE)
and the same gradient-texturing technique used throughout the low-poly modeling work of
creators like Imphenzia and Kay Kits.
