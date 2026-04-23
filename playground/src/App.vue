<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { Player } from '@outercloud/animoo'

const canvas = useTemplateRef('canvas')

onMounted(() => {
	const player = new Player(canvas.value!)
	player.play()
})
</script>

<template>
	<canvas ref="canvas" />
</template>
