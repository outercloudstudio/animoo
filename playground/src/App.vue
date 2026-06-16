<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { player, Rect, Vector2, ease, Renderer, Camera } from '@outercloud/animoo'
import { mat4, vec3 } from 'gl-matrix'

const canvas = useTemplateRef('canvas')

onMounted(async () => {
    const camera = new Camera()

	const animation = await player(canvas.value!, camera, function* ({ add }: any) {
		const rect = add(new Rect({}))
        
        yield* rect.position.to(new Vector2(100, 100), 1, ease)
        yield* rect.position.to(new Vector2(200, 0), 1, ease)
        yield* rect.position.to(new Vector2(0, 0), 1, ease)
	})

	animation.play()
    
    // const renderer = new Renderer(canvas.value!)
    // const camera = new Camera()
    // await renderer.setup(camera)

    // let angle = 0
    // let last = Date.now()
    
    // function render() {
    //     renderer.render(camera)
    
    //     const now = Date.now()
    //     angle += (now - last) / 1000 * 1
    //     last = now

    //     camera.position = vec3.fromValues(3 * Math.cos(angle), camera.position[1], 3 * Math.sin(angle))
    
    //     requestAnimationFrame(render)
    // }

    // render()
})
</script>

<template>
	<canvas ref="canvas" width="1920" height="1200" />
</template>
