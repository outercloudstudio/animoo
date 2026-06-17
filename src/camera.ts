import { mat4, vec2 } from 'gl-matrix'

import { react, Reactive } from "./react.ts";
import { Vector2 } from "./vector.ts";
import { Camera2DTransform } from "./renderer.ts";

export class Camera2D {
    public position: Reactive<Vector2> = react(new Vector2(0, 0))
    public rotation: Reactive<number> = react(0)
    public scale: Reactive<number> = react(1)

    public toTransform(): Camera2DTransform {
        return {
            position: vec2.fromValues(this.position.value.x, this.position.value.y),
            rotation: this.rotation.value,
            scale: this.scale.value
        }
    }
}