<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { player, Rect, Vector2, ease, Ellipse, hex, Spline } from '@outercloud/animoo'

const canvas = useTemplateRef('canvas')

onMounted(async () => {
	const animation = await player(canvas.value!, function* ({ camera, add }: any) {
        function* cameraAnimations() {
            yield camera.rotation.to(2 * Math.PI, 4)
            yield camera.scale.to(2, 2, ease)

            yield* camera.position.to(new Vector2(-200, 200), 2, ease)
            yield camera.position.to(new Vector2(0, 0), 2, ease)
            yield camera.scale.to(1, 2, ease)
        }

        yield cameraAnimations()

        function* spline() {
            const spline = add(new Spline({}))

            yield spline.positionB.to(new Vector2(800, 300), 4, ease)
            yield* spline.positionC.to(new Vector2(0, 800), 4, ease)
            yield* spline.positionC.to(new Vector2(300, 0), 4, ease)
        }

		add(new Rect({
            color: hex('#100f21'),
            size: new Vector2(1920, 1200),
        }))

        const color = hex('#1c1a31')
        const colorBorder = hex('#232235')

        function createSquare(location: Vector2) {
            const squareBackground = add(new Rect({
                position: location,
                color: colorBorder,
                size: new Vector2(260, 260),
                radius: 35
            }))

            const square = add(new Rect({
                position: location,
                color: color,
                size: new Vector2(250, 250),
                radius: 30
            }))
        }

        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                createSquare(new Vector2(x * 280, y * 280))
            }
        }

        function* createDataA(index: number) {
            const data = add(new Ellipse({
                position: new Vector2(-280 * 2 - index * 280, 280 - index * 280),
                color: hex('#a18ef4'),
                size: new Vector2(150, 150),
            }))

            const size = data.size.value
            data.size.value = new Vector2(0, 0)
            yield* data.size.to(size, 1, ease)

            yield* data.position.to(data.position.value.add(new Vector2(280, 0)), 1, ease)
            yield* data.position.to(data.position.value.add(new Vector2(280, 0)), 1, ease)
            yield* data.position.to(data.position.value.add(new Vector2(280, 0)), 1, ease)
            yield* data.position.to(data.position.value.add(new Vector2(280, 0)), 1, ease)
            
            for(let i = 0; i < index; i++) {
                yield* data.position.to(data.position.value.add(new Vector2(280, 0)), 1, ease)
            }

            yield* data.size.to(new Vector2(0, 0), 1, ease)
        }

        yield createDataA(0)
        yield createDataA(1)
        yield createDataA(2)

        function* createDataB(index: number) {
            const data = add(new Ellipse({
                position: new Vector2(-280 + index * 280, 280 * 2 + index * 280),
                color: hex('#29abf2'),
                size: new Vector2(150, 150),
            }))

            const size = data.size.value
            data.size.value = new Vector2(0, 0)
            yield* data.size.to(size, 1, ease)

            yield* data.position.to(data.position.value.add(new Vector2(0, -280)), 1, ease)
            yield* data.position.to(data.position.value.add(new Vector2(0, -280)), 1, ease)
            yield* data.position.to(data.position.value.add(new Vector2(0, -280)), 1, ease)
            yield* data.position.to(data.position.value.add(new Vector2(0, -280)), 1, ease)
            
            for(let i = 0; i < index; i++) {
                yield* data.position.to(data.position.value.add(new Vector2(0, -280)), 1, ease)
            }

            yield* data.size.to(new Vector2(0, 0), 1, ease)
        }

        yield createDataB(0)
        yield createDataB(1)
        yield createDataB(2)

        yield spline()
	})

	animation.play()
})
</script>

<template>
	<canvas ref="canvas" width="1920" height="1200" />
</template>
