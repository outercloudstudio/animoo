import path from 'node:path'

const prefix = '@virtual:external/'

export function virtualModule() {
    return {
        name: 'virtual-module',
        enforce: 'pre',
        resolveId(id) {
            if (id.startsWith(prefix)) {
                const relativePath = id.slice(prefix.length)

                const absolutePath = path.resolve(Deno.cwd(), relativePath)

                return absolutePath
            }

            return null
        }
    }
}