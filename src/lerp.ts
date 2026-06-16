import { Vector2, Vector4 } from "./vector.ts"

export function lerp<T>(a: T, b: T, t: number): T {
    if (typeof a === 'number' && typeof b === 'number') {
        return <T>(a + (b - a) * t)
    } else if (a instanceof Vector2 && b instanceof Vector2) {
        return <T>new Vector2(lerp(a.x, b.x, t), lerp(a.y, b.y, t))
    } else if (a instanceof Vector4 && b instanceof Vector4) {
        return <T>new Vector4(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t), lerp(a.w, b.w, t))
    }

    return a
}

export function ease(x: number): number {
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function easeIn(x: number): number {
	return x * x * x
}

export function easeOut(x: number): number {
	return 1 - Math.pow(1 - x, 3)
}

export function easeOutQuint(x: number): number {
	return 1 - Math.pow(1 - x, 5)
}

export function easeOutBack(x: number): number {
	const c1 = 1.70158
	const c3 = c1 + 1

	return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

export function linear(x: number): number {
	return x
}