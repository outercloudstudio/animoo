<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import { Player, player, VideoRenderer, type Clip } from '@outercloud/animoo'

const canvas = useTemplateRef('canvas')
const clips: ShallowRef<Clip[]> = shallowRef([])
const selectedClipName: Ref<string | null> = ref(null)
const selectedClip: ComputedRef<Clip | null> = computed(() => {
    if(selectedClipName.value === null) return null

    return clips.value.find(clip => clip.name === selectedClipName.value) ?? null
})

let setupPlayer: Player | null = null

onMounted(async () => {
    // @ts-ignore
    const module = (await import('@virtual:external/project.ts'))
    const project = module.default

    clips.value = project.clips
    if(clips.value.length > 0) selectedClipName.value = clips.value[0].name
})

if (import.meta.hot) {
    import.meta.hot.accept('@virtual:external/project.ts', module => {
        if(!module) return

        const project = module.default

        clips.value = project.clips
    })
}

watch(selectedClip, async selectedClip => {
    if(!selectedClip) return
    if(!canvas.value) return

    if(setupPlayer === null) {
        setupPlayer = await player(canvas.value, selectedClip.context)
        setupPlayer.play()
        
        return
    }
    
    setupPlayer.setContext(selectedClip.context)
})

async function go() {
    if(!selectedClip.value) return
    
	const videoRenderer = new VideoRenderer(selectedClip.value.context)

	await videoRenderer.setup()
	await videoRenderer.go()
}
</script>

<template>
	<canvas ref="canvas" width="1920" height="1200" />

    <select v-model="selectedClipName">
        <option v-for="clip in clips" :value="clip.name">{{ clip.name }}</option>
    </select>

    <button @click="go" >Render to mp4</button>
</template>
