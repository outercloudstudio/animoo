<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { player, Rect } from '@outercloud/animoo'

const canvas = useTemplateRef('canvas')

onMounted(() => {
	const animation = player(canvas.value!, function* ({ add }: any) {
		const rect = add(new Rect())
	})
	animation.play()
})
</script>

<template>
	<canvas ref="canvas" />
</template>
