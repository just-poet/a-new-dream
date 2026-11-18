import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const result = await build({
  entryPoints: ["game.js"],
  bundle: true,
  write: false,
  minify: true,
  target: ["chrome110", "edge110", "safari17", "firefox115"],
  legalComments: "inline",
});
const [shell, style] = await Promise.all(
  ["shell.html", "style.css"].map((file) => readFile(file, "utf8")),
);
const fonts = [
  [
    "DM Serif Text",
    "400",
    "@fontsource/dm-serif-text",
    "dm-serif-text-latin-400-normal.woff2",
  ],
  [
    "DM Sans",
    "100 1000",
    "@fontsource-variable/dm-sans",
    "dm-sans-latin-wght-normal.woff2",
  ],
];
const declarations = await Promise.all(
  fonts.map(async ([family, weight, pkg, file]) => {
    const data = await readFile("node_modules/" + pkg + "/files/" + file);
    return (
      "@font-face{font-family:'" +
      family +
      "';font-weight:" +
      weight +
      ";font-style:normal;src:url(data:font/woff2;base64," +
      data.toString("base64") +
      ") format('woff2');font-display:swap}"
    );
  }),
);
const licenses = await Promise.all(
  ["three", ...fonts.map((f) => f[2])].map((pkg) =>
    readFile("node_modules/" + pkg + "/LICENSE", "utf8"),
  ),
);
const html =
  shell
    .replace("/*STYLE*/", () => declarations.join("\n") + "\n" + style)
    .replace("/*SCRIPT*/", () =>
      result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script"),
    ) +
  "\n<!--\n" +
  licenses.join("\n") +
  "\n-->";
await mkdir("../dist", { recursive: true });
await writeFile("../dist/index.html", html);
console.log(
  "Built A New Dream, " + Math.round(Buffer.byteLength(html) / 1024) + " KB",
);
