export function* frame() {
	yield null
}

export function* seconds(time: number) {
	let finalFrame = Math.floor(time * 60)

	for (let f = 1; f <= finalFrame; f++) {
		yield* frame()
	}
}