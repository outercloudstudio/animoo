# Animoo

![Animoo Logo Hero](./assets/animoo-hero.gif)

**The web motion graphics framework accelerated with WebGPU.** Animoo let's you
create procedural motion graphics with a friendly API. Animoo is directly
embedable into your website or export your animations as videos.

### By the Way

If you find Animoo helpful or interesting, give this repo a star. ⭐ It lets me
know people are interested.

## Installation

```bash
deno install @outercloud/animoo
deno install --global --allow-all -n animoo @outercloud/animoo/cli.ts
```

## Quick Start

Create a file named `project.ts` in your root directory.

Initialize a project and example clip.

```ts
import { clip, hex, project } from "@outercloud/animoo";

const clip1 = clip("Clip 1", {}, function* ({ background, add }: any) {
  background(hex("#FFAF00"));
});

export default project([clip1]);
```

Launch the previewer by running animoo in your terminal.

```bash
animoo
```

Visit the previewer url in your browser. The URL will likely be
http://127.0.0.1:5174/.

## Feedback

I'd love to hear your feedback or whatever you're working on with Animoo.

- [Discord](https://discord.gg/z9GKKaJfhJ)
- [Open an Issue](https://github.com/outercloudstudio/animoo/issues)

## Contributing

[See CONTRIBUTING.md](./.github/CONTRIBUTING.md)

## License

[MIT](https://raw.githubusercontent.com/outercloudstudio/animoo/refs/heads/main/LICENSE)

---

Made with love from [Outer Cloud](https://outercloud.dev)
