export function* frame(): Generator<null, void, unknown> {
	yield null
}

export function* seconds(time: number): Generator<null, void, unknown>  {
	let finalFrame = Math.floor(time * 60)

	for (let f = 1; f <= finalFrame; f++) {
		yield* frame()
	}
}