<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { player } from '@outercloud/animoo'

const canvas = useTemplateRef('canvas')

onMounted(async () => {
    const clip = (await import('@virtual:external/test.ts')).clip

    const animation = await player(canvas.value!, clip)
    animation.play()

    if (import.meta.hot) {
        import.meta.hot.accept('@virtual:external/test.ts', module => {
            animation.setContext(module.clip)
        })
    }
})

// async function go() {
    // const droidSerifFont = new Font(DroidSerif)
    // await droidSerifFont.load()

// 	const videoRenderer = new VideoRenderer()

// 	await videoRenderer.setup()
// 	await videoRenderer.go()
// }
</script>

<template>
	<canvas ref="canvas" width="1920" height="1200" />
</template>
