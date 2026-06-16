<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { player, Rect, Vector2, ease, Renderer, Camera, Vector4 } from '@outercloud/animoo'
import { mat4, vec2, vec3 } from 'gl-matrix'

const canvas = useTemplateRef('canvas')

onMounted(async () => {
    const camera = new Camera()

	const animation = await player(canvas.value!, camera, function* ({ add }: any) {
		const rect = add(new Rect({
            color: new Vector4(0, 0, 1, 1),
            size: new Vector2(600, 300),
            radius: 30,
        }))

        const rect2 = add(new Rect({
            position: new Vector2(1, 0),
            color: new Vector4(0, 1, 0, 0.5)
        }))
        
        yield* rect.radius.to(0, 1, ease)
        yield* rect.color.to(new Vector4(1, 0, 0, 1), 1, ease)
        yield* rect.rotation.to(Math.PI, 4, ease)
        yield* rect.radius.to(30, 1, ease)
        yield* rect.color.to(new Vector4(0, 0, 1, 1), 1, ease)
        // yield* rect.position.to(new Vector2(100, 100), 1, ease)
        // yield* rect.position.to(new Vector2(200, 0), 1, ease)
        // yield* rect.position.to(new Vector2(0, 0), 1, ease)
	})

	animation.play()
})
</script>

<template>
	<canvas ref="canvas" width="1920" height="1200" />
</template>
