import { OptionallyReactable, react, Reactive } from "../react"
import { Vector2, Vector4 } from "../vector"

export class Rect {
    public position: Reactive<Vector2> = react(new Vector2(0, 0))
    public origin: Reactive<Vector2> = react(new Vector2(0.5, 0.5))
    public size: Reactive<Vector2> = react(new Vector2(100, 100))
    public rotation: Reactive<number> = react(0)
    public color: Reactive<Vector4> = react(new Vector4(1, 1, 1, 1))
    public radius: Reactive<number> = react(0)
    public order: Reactive<number> = react(0)

    public constructor(options: {
        position?: OptionallyReactable<Vector2>
        origin?: OptionallyReactable<Vector2>
        size?: OptionallyReactable<Vector2>
        rotation?: OptionallyReactable<number>
        color?: OptionallyReactable<Vector4>
        radius?: OptionallyReactable<number>
        order?: OptionallyReactable<number>
    }) {
        for (const key of Object.keys(options)) {
            //@ts-ignore
            this[key] = react(options[key])
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = `rgba(${this.color.value.x * 255}, ${this.color.value.y * 255}, ${this.color.value.z * 255}, ${this.color.value.w})`
		
        ctx.fillRect(this.position.value.x, this.position.value.y, this.size.value.x, this.size.value.y)
	}
}