<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { player, Rect, Vector2, ease } from '@outercloud/animoo'

const canvas = useTemplateRef('canvas')

onMounted(() => {
	const animation = player(canvas.value!, function* ({ add }: any) {
		const rect = add(new Rect({}))
        
        yield* rect.position.to(new Vector2(100, 100), 1, ease)
        yield* rect.position.to(new Vector2(200, 0), 1, ease)
        yield* rect.position.to(new Vector2(0, 0), 1, ease)
	})

	animation.play()
})
</script>

<template>
	<canvas ref="canvas" />
</template>
