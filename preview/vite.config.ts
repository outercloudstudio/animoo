import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { virtualModule } from './plugins/virtualModule'

// https://vite.dev/config/
export default defineConfig({
	plugins: [vue(), virtualModule()],
	resolve: {
		alias: {
			'@outercloud/animoo': resolve(__dirname, '../mod.ts'),
		},
	},
})
