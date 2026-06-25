export type Clip = {
    name: string,
    width: number,
    height: number,
    frameRate: number,
    context: any
}

export type Project = {
    clips: Clip[]
}

export function clip(name: string, options: {
    width?: number,
    height?: number
    frameRate?: number
}, context: any): Clip {
    const clipDefinition = {
        name,
        width: 1920,
        height: 1200,
        frameRate: 60,
        context: null
    }

    for (const key of Object.keys(options)) {
        //@ts-ignore
        this[key] = react(options[key])
    }

    clipDefinition.context = context

    return clipDefinition
}

export function project(clips: Clip[]): Project {
    return {
        clips
    }
}