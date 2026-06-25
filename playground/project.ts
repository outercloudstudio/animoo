import { player, Rect, Vector2, ease, Ellipse, hex, Spline, Triangle, Font, Letter, seconds, easeOut, easeOutBack, easeIn, react, linear, Vector4, VideoRenderer, project, clip } from '@outercloud/animoo'
import DroidSerif from './src/assets/droid-serif.regular.ttf'

const droidSerifFont = new Font(DroidSerif)
await droidSerifFont.load()

const clip1 = clip('Clip 1', {}, function* ({ camera, add, background }: any) {
    background(hex('#100f21'))
    
    function* animateLetterIn(letter: Letter) {
        letter.size.value = new Vector2(0, 0)
        letter.rotation.value = Math.PI / 8
        letter.color.value = hex('#FFFFFF00')
        
        yield letter.rotation.to(0, 1, easeOutBack)
        yield letter.color.to(hex('#FFFFFF'), 1, easeOutBack)
        yield* letter.size.to(new Vector2(100, 100), 1, easeOutBack)
    }

    function renderText(text: string, position: Vector2, size: number, color: Vector4, order?: number) {
        let positionX = 0
        for(const character of text) {
            const letter = add(new Letter({
                font: droidSerifFont,
                size: new Vector2(size, size),
                character: character,
                color,
                order: order ?? 0
            }))

            positionX += letter.spacing().left

            letter.position.value = new Vector2(position.x + positionX, position.y)

            positionX += letter.spacing().width + letter.spacing().right
        }
    }
    
    renderText('Systolic Array - Data Flow', new Vector2(-450, 500), 50, hex('#FFFFFF'), 100)

    renderText('Matrix A (→)', new Vector2(-300, -520), 30, hex('#a18ef4'), 100)
    add(new Rect({
        position: new Vector2(-340, -505),
        size: new Vector2(40, 40),
        color: hex('#a18ef4')
    }))

    renderText('Matrix B (↓)', new Vector2(120, -520), 30, hex('#29abf2'), 100)
    add(new Rect({
        position: new Vector2(120 -40, -505),
        size: new Vector2(40, 40),
        color: hex('#29abf2')
    }))

    function* cameraAnimations() {
        yield camera.rotation.to(2 * Math.PI, 4)
        yield camera.scale.to(2, 2, ease)

        yield* camera.position.to(new Vector2(-200, 200), 2, ease)
        yield camera.position.to(new Vector2(0, 0), 2, ease)
        yield camera.scale.to(1, 2, ease)
    }

    // yield cameraAnimations()
    
    const color = hex('#1c1a31')
    const colorBorder = hex('#232235')

    function createSquare(location: Vector2) {
        const squareBackground = add(new Rect({
            position: location,
            color: colorBorder,
            size: new Vector2(210, 210),
            radius: 35
        }))

        const square = add(new Rect({
            position: location,
            color: color,
            size: new Vector2(200, 200),
            radius: 30
        }))

        renderText('PE', location.add(new Vector2(-45, -20)), 50, colorBorder)
    }

    for(let x = -1; x <= 1; x++) {
        for(let y = -1; y <= 1; y++) {
            createSquare(new Vector2(x * 230, y * 230))
        }
    }

    function* createExplosion(position: Vector2) {
        for(let i = 0; i < 8; i++) {
            const rotation = i * 2 * Math.PI / 8

            const particle = add(new Rect({
                position: position,
                color: hex('#f0af28'),
                size: new Vector2(30, 10),
                rotation: rotation
            }))

            yield particle.position.to(particle.position.value.add(new Vector2(Math.cos(rotation) * 100, Math.sin(rotation) * 100)), 0.5, easeOut)
            yield particle.size.to(new Vector2(0, 0), 0.5, easeIn)
        } 
    }

    const dataAValues = [1, 2, 3]
    const dataBValues = [3, 2, 1]

    function* createDataA(index: number) {
        const data = add(new Ellipse({
            position: new Vector2(-230 * 2 + 50, 230 - index * 230),
            color: hex('#a18ef400'),
            size: new Vector2(100, 100),
            order: 50,
        }))

        const letter = add(new Letter({
            font: droidSerifFont,
            character: dataAValues[index].toString(),
            order: () => data.order.value + 1,
            position: () => data.position.value,
            origin: new Vector2(0.6, 0.5),
            positionMode: 'box',
            size: () => new Vector2(data.size.value.x * 0.5, data.size.value.y * 0.5),
            color: () => new Vector4(1, 1, 1, data.color.value.w)
        }))

        const size = data.size.value
        data.size.value = new Vector2(0, 0)

        yield* seconds(index * 1)

        let resultIndex = 0
        
        for(let i = index; i < index + 4; i++) {
            if(i === index) {
                yield data.size.to(size, 0.5, ease)
                yield data.color.to(hex('#a18ef4'), 0.5, ease)
            }

            if(i > index && i < index + 4) {
                yield createExplosion(data.position.value)

                const result = add(new Ellipse({
                    position: data.position.value,
                    color: hex('#f0af2800'),
                    size: new Vector2(0, 0),
                    order: 30,
                }))

                const letter = add(new Letter({
                    font: droidSerifFont,
                    character: (dataAValues[index] * dataBValues[resultIndex]).toString(),
                    order: () => result.order.value + 1,
                    position: () => result.position.value,
                    origin: new Vector2(0.6, 0.5),
                    positionMode: 'box',
                    size: () => new Vector2(result.size.value.x * 0.5, result.size.value.y * 0.5),
                    color: () => new Vector4(1, 1, 1, result.color.value.w)
                }))

                resultIndex++

                function* animation() {
                    yield* seconds(0.2)
                    yield result.color.to(hex('#f0af28'), 1, ease)
                    yield result.size.to(new Vector2(100, 100), 1, ease)

                    yield* seconds(6 - i)

                    yield result.color.to(hex('#f0af2800'), 1, ease)
                }

                yield animation()
            }

            yield* seconds(0.5)

            yield* data.position.to(data.position.value.add(new Vector2(230 + (i === index ? -50 : 0) + (i === index + 3 ? -50 : 0), 0)), 0.5, easeIn)
        }
        
        yield data.color.to(hex('#a18ef400'), 0.5, easeIn)
        yield* data.size.to(new Vector2(0, 0), 0.5, easeIn)
    }

    yield createDataA(0)
    yield createDataA(1)
    yield createDataA(2)

    function* createDataB(index: number) {
        const data = add(new Ellipse({
            position: new Vector2(-230 + index * 230, 230 * 2 - 50),
            color: hex('#29abf200'),
            size: new Vector2(100, 100),
            order: 60,
        }))

        const letter = add(new Letter({
            font: droidSerifFont,
            character: dataBValues[index].toString(),
            order: () => data.order.value + 1,
            position: () => data.position.value,
            origin: new Vector2(0.6, 0.5),
            positionMode: 'box',
            size: () => new Vector2(data.size.value.x * 0.5, data.size.value.y * 0.5),
            color: () => new Vector4(1, 1, 1, data.color.value.w)
        }))

        const size = data.size.value
        data.size.value = new Vector2(0, 0)

        yield* seconds(index * 1)
        
        for(let i = index; i < index + 4; i++) {
            if(i === index) {
                yield data.size.to(size, 0.5, ease)
                yield data.color.to(hex('#29abf2'), 0.5, ease)
            }

            yield* seconds(0.5)

            yield* data.position.to(data.position.value.add(new Vector2(0, -230 + (i === index ? 50 : 0) + (i === index + 3 ? 50 : 0))), 0.5, easeIn)
        }

        yield data.color.to(hex('#29abf200'), 0.5, easeIn)
        yield* data.size.to(new Vector2(0, 0), 0.5, easeIn)
    }

    yield createDataB(0)
    yield createDataB(1)
    yield createDataB(2)
})

const clip2 = clip('Clip 2', {}, function* ({ background }: any) {
    background(hex('#00FF00'))
})

const animooLogo = clip('Animoo Logo', {}, function* ({ add, background }: any) {
    background(hex('#000000'))
    
    function* animateLetterIn(letter: Letter, size: number) {
        letter.size.value = new Vector2(0, 0)
        letter.rotation.value = Math.PI / 8
        letter.color.value = hex('#FFFFFF00')
        
        yield letter.rotation.to(0, 0.4, easeOutBack)
        yield letter.color.to(hex('#FFFFFF'), 0.4, easeOutBack)
        yield* letter.size.to(new Vector2(size, size), 0.4, easeOutBack)
    }

    function* animateLetterIn(letter: Letter, size: number) {
        letter.size.value = new Vector2(0, 0)
        letter.rotation.value = Math.PI / 8
        letter.color.value = hex('#FFFFFF00')
        
        yield letter.rotation.to(0, 0.4, easeOutBack)
        yield letter.color.to(hex('#FFFFFF'), 0.4, easeOutBack)
        yield* letter.size.to(new Vector2(size, size), 0.4, easeOutBack)
    }

    function* animateLetterOut(letter: Letter) {
        yield* seconds(2.2)
        
        yield letter.rotation.to(Math.PI / 16, 0.4, easeOutBack)
        yield* seconds(0.05)
        yield letter.color.to(hex('#FFFFFF00'), 0.4, easeIn)
        yield* letter.size.to(new Vector2(0, 0), 0.4, easeIn)
    }

    function* renderText(text: string, position: Vector2, size: number, color: Vector4, order?: number) {
        let positionX = 0
        for(const character of text) {
            const letter = add(new Letter({
                font: droidSerifFont,
                size: new Vector2(size, size),
                character: character,
                color,
                order: order ?? 0
            }))

            positionX += letter.spacing().left

            letter.position.value = new Vector2(position.x + positionX, position.y)

            positionX += letter.spacing().width + letter.spacing().right

            yield animateLetterIn(letter, size)
            yield* seconds(0.05)
            yield animateLetterOut(letter)
        }
    }

    function* dot() {
        const dot = add(new Rect({
            color: hex('#f5d44200'),
            position: new Vector2(-91 - 31 / 2, 106),
            size: new Vector2(31, 35),
            radius: 15,
            origin: new Vector2(0, 0.5),
            order: 400
        }))

        yield* seconds(0.5)
        
        yield dot.color.to(hex('#f5d442'), 0.2, easeIn)
        yield* dot.size.to(new Vector2(615, 35), 1, ease)

        yield function*() {
            yield* seconds(0.9)
            yield* dot.color.to(hex('#f5d44200'), 0.1, easeIn)
        }()
        yield dot.position.to(new Vector2(-91 - 31 / 2 + 615, 106), 1, easeIn)
        yield* dot.size.to(new Vector2(0, 35), 1, easeIn)
    }

    yield dot()
    
    yield* renderText('Animoo', new Vector2(-500, -80), 200, hex('#FFFFFF'), 100)
})

export default project([ clip1, clip2, animooLogo ])