import path from 'node:path'

const projectPath = Deno.env.get("ANIMOO_PROJECT_PATH")

const prefix = '@virtual:external/'

export function virtualModule() {
    return {
        name: 'virtual-module',
        enforce: 'pre',
        resolveId(id) {            
            if (id.startsWith(prefix)) {
                const relativePath = id.slice(prefix.length)

                const absolutePath = path.resolve(projectPath, relativePath)

                return absolutePath
            }

            return null
        }
    }
}