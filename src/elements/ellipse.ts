import { OptionallyReactable, react, Reactive } from "../react"
import { Vector2, Vector4 } from "../vector"

export class Ellipse {
    public position: Reactive<Vector2> = react(new Vector2(0, 0))
    public origin: Reactive<Vector2> = react(new Vector2(0.5, 0.5))
    public size: Reactive<Vector2> = react(new Vector2(100, 100))
    public color: Reactive<Vector4> = react(new Vector4(1, 1, 1, 1))
    public order: Reactive<number> = react(0)

    public constructor(options: {
        position?: OptionallyReactable<Vector2>
        origin?: OptionallyReactable<Vector2>
        size?: OptionallyReactable<Vector2>
        color?: OptionallyReactable<Vector4>
        order?: OptionallyReactable<number>
    }) {
        for (const key of Object.keys(options)) {
            //@ts-ignore
            this[key] = react(options[key])
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = 'red'
		ctx.fillRect(0, 0, 100, 100)
	}
}