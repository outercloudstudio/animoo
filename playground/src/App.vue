<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { player, VideoRenderer } from '@outercloud/animoo'

const canvas = useTemplateRef('canvas')
let latestClip: any = null

onMounted(async () => {
    const clip = (await import('@virtual:external/project.ts')).clip
    latestClip = clip

    const animation = await player(canvas.value!, clip)
    animation.play()

    if (import.meta.hot) {
        import.meta.hot.accept('@virtual:external/project.ts', module => {
            animation.setContext(module.clip)
            latestClip = clip
        })
    }
})

async function go() {
	const videoRenderer = new VideoRenderer(latestClip)

	await videoRenderer.setup()
	await videoRenderer.go()
}
</script>

<template>
	<canvas ref="canvas" width="1920" height="1200" />
    <button @click="go" >Render to mp4</button>
</template>
