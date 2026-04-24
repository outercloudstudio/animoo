import { frame } from './delay'
import { lerp } from './lerp'

export type Reactable<T> = () => T
export type OptionallyReactable<T> = T | Reactable<T>

export function ensureReactable<T>(value: OptionallyReactable<T>): Reactable<T> {
	if (typeof value !== 'function') return () => <T>value

	return <Reactable<T>>value
}

export class Reactive<T> {
	constructor(public reactable: Reactable<T>) {}

	public get value(): T {
		return this.reactable()
	}

	public set value(value: OptionallyReactable<T>) {
		this.reactable = ensureReactable(value)
	}

	public *to(final: T, time: number, ease?: (t: number) => number): Generator {
		let initial = this.value
		let finalFrame = Math.floor(time * 60)

		for (let f = 1; f <= finalFrame; f++) {
			let progress = ease === undefined ? f / finalFrame : ease(f / finalFrame)
			this.value = <T>lerp(initial, final, progress)

			yield* frame()
		}

		this.value = final
	}

	public *bounce(final: T, speed: number, ease?: (t: number) => number, times?: number): Generator {
		let loopCount = 0
		let forward = true

		let initial = this.value
		let finalFrame = Math.floor(speed * 60)

		while (times === undefined || loopCount < times) {
			for (let f = 1; f <= finalFrame; f++) {
				let progress = 0

				if (forward) {
					progress = ease === undefined ? f / finalFrame : ease(f / finalFrame)
				} else {
					progress = ease === undefined ? 1 - f / finalFrame : ease(1 - f / finalFrame)
				}

				this.value = <T>lerp(initial, final, progress)

				yield* frame()
			}

			forward = !forward

			loopCount++
		}
	}
}

export function react<T>(value: OptionallyReactable<T>): Reactive<T> {
	return new Reactive<T>(ensureReactable(value))
}