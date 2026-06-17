import { Vector4 } from "./vector.ts";

export function rgba(r: number, g: number, b: number, a: number): Vector4 {
	return new Vector4(r / 255, g / 255, b / 255, a)
}

export function hex(hex: string): Vector4 {
    if(hex.startsWith('#')) hex = hex.substring(1)

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    
    const a = hex.length > 6 ? parseInt(hex.substring(6, 8), 16) : 1

	return new Vector4(r / 255, g / 255, b / 255, a)
}