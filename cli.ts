const command = new Deno.Command("deno", {
  args: ["task", "dev"],
  cwd: new URL("./", import.meta.url).pathname,
  env: {
    ...Deno.env.toObject(),
    ANIMOO_PROJECT_PATH: Deno.cwd(),
  },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
})

const process = command.spawn()

Deno.cwd()