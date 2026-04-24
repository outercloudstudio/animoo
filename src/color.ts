import { Vector4 } from "./vector";

export function rgba(r: number, g: number, b: number, a: number): Vector4 {
	return new Vector4(r / 255, g / 255, b / 255, a)
}