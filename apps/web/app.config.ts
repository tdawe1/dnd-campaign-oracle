import { defineConfig } from '@tanstack/start/config'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
    vite: {
        plugins: [
            viteReact({
                babel: {
                    plugins: [
                        [
                            'babel-plugin-react-compiler',
                            {
                                target: '19',
                            },
                        ],
                    ],
                },
            }),
        ],
    },
})
