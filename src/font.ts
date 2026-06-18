export type Glyph = { numberOfContours: number, xMin: number, yMin: number, xMax: number, yMax: number, endPtsOfContours: number[], points: { x: number, y: number, onCurve: boolean }[] }

export class Font {
    public url: string
    
    private loca: any = null
    private glyf: Glyph[] | null = null

    constructor(url: string) {
        this.url = url
    }

    public async load() {
        const response = await fetch(this.url)
        const bytes = await response.bytes()

        let pointer = 0

        function getUInt8(): number {
            const data = bytes[pointer]

            pointer++

            return data
            
        }

        function getUInt16(): number {
            return (getUInt8() << 8) | getUInt8() >>> 0
        }

        function getInt16(): number {
            let number = getUInt16()

            if (number & 0x8000) number -= 1 << 16
            
            return number
        }

        function getInt32(): number {
            return (getUInt8() << 24) | (getUInt8() << 16) | (getUInt8() << 8) | getUInt8()
        }

        function getUInt32(): number {
            return ((getUInt8() << 24) | (getUInt8() << 16) | (getUInt8() << 8) | getUInt8()) >>> 0
        }

        function getString(length: number): string {
            let result = ''

            for(let index = 0; index < length; index++) {
                result += String.fromCharCode(getUInt8())
            }

            return result
        }

        function getFixed(): number {
            return getInt32() / (1 << 16)
        }

        function skip(bytes: number) {
            pointer += bytes
        }

        getInt32()
        const numTables = getUInt16()
        getUInt16()
        getUInt16()
        getUInt16()

        const tables: Record<string, any> = {}

        for (let i = 0; i < numTables; i++) {
            const tag = getString(4)

            tables[tag] = {
                checksum: getUInt32(),
                offset: getUInt32(),
                length: getUInt32(),
            }
        }

        console.log('Tables', tables)

        pointer = tables['head'].offset

        const header = {
            majorVersion: getUInt16(),
            minorVersion: getUInt16(),
            fontRevision: getFixed(),
            checksumAdjustment: getUInt32(),
            magicNumber: getUInt32(),
            flags: getUInt16(),
            unitsPerEm: getUInt16(),
            created: skip(8),
            modified: skip(8),
            xMin: getInt16(),
            yMin: getInt16(),
            xMax: getInt16(),
            yMax: getInt16(),
            macStyle: getUInt16(),
            lowestRecPPEM: getUInt16(),
            fontDirectionHint: getInt16(),
            indexToLocFormat: getInt16(),
            glyphDataFormat: getInt16(),
        }

        console.log('Header', header)

        pointer = tables['maxp'].offset

        const maximumProfile = {
            version: getFixed(),
            numberOfGlyphs: getUInt16(),
            maxPoints: getUInt16(),
            maxContours: getUInt16(),
            maxCompositePoints: getUInt16(),
            maxCompositeContours: getUInt16(),
            maxZones: getUInt16(),
            maxTwilightPoints: getUInt16(),
            maxStorage: getUInt16(),
            maxFunctionDefinitions: getUInt16(),
            maxInstructionDefinitions: getUInt16(),
            maxStackElements: getUInt16(),
            maxSizeOfInstructions: getUInt16(),
            maxComponentElements: getUInt16(),
            maxComponentDepth: getUInt16(),
        }

        console.log('Maximum Profile', maximumProfile)

        pointer = tables['loca'].offset

        const loca: number[] = []
        for (let i = 0; i < maximumProfile.numberOfGlyphs + 1; i++) {
            if(header.indexToLocFormat === 0) {
                loca.push(getUInt16())
            } else {
                loca.push(getUInt32())
            }
        }

        this.loca = loca

        console.log('Loca', loca)

        pointer = tables['glyf'].offset

        const glyf: any = []

        for (let i = 0; i < loca.length - 1; i++) {
            const locaOffset = loca[i] * (header.indexToLocFormat === 0 ? 2 : 1)

            pointer = tables['glyf'].offset + locaOffset

            const data: Glyph = {
                numberOfContours: getInt16(),
                xMin: getInt16(),
                yMin: getInt16(),
                xMax: getInt16(),
                yMax: getInt16(),
                endPtsOfContours: [],
                points: []
            }

            for(let i = 0; i < data.numberOfContours; i++) {
                data.endPtsOfContours.push(getUInt16())
            }

            const instructionLength = getUInt16()

            skip(instructionLength)

            const points = data.endPtsOfContours[data.endPtsOfContours.length - 1] + 1

            let flags: { onCurve: boolean, xShort: boolean, yShort: boolean, repeat: boolean, xIsSameOrPositiveXShortVector: boolean, yIsSameOrPositiveYShortVector: boolean }[] = []

            while (flags.length < points) {
                const data = getUInt8()

                const flag = {
                    onCurve: (data & 1) === 1, 
                    xShort: ((data >> 1) & 1) === 1, 
                    yShort: ((data >> 2) & 1) === 1, 
                    repeat: ((data >> 3) & 1) === 1, 
                    xIsSameOrPositiveXShortVector: ((data >> 4) & 1) === 1, 
                    yIsSameOrPositiveYShortVector: ((data >> 5) & 1) === 1, 
                }

                flags.push(flag)

                if (flag.repeat) {
                    const repeatCount = getUInt8()
                    
                    for (let j = 0; j < repeatCount; j++) {
                        flags.push({ ...flag })
                    }
                }
            }

            let xValues: number[] = []
            let lastX = 0
            for(let i = 0; i < points; i++) {
                const flag = flags[i]

                if(flag.xShort) {
                    const delta = getUInt8()

                    lastX += flag.xIsSameOrPositiveXShortVector ? delta : -delta
                } else if (!flag.xIsSameOrPositiveXShortVector) {
                    lastX += getInt16()
                }
                                
                xValues.push(lastX)
            }

            let yValues: number[] = []
            let lastY = 0
            for(let i = 0; i < points; i++) {
                const flag = flags[i]

                if(flag.yShort) {
                    const delta = getUInt8()

                    lastY += flag.yIsSameOrPositiveYShortVector ? delta : -delta
                } else if (!flag.yIsSameOrPositiveYShortVector) {
                    lastY += getInt16()
                }
                                
                yValues.push(lastY)
            }

            for(let i = 0; i < points; i++) {
                data.points.push({
                    x: xValues[i],
                    y: yValues[i],
                    onCurve: flags[i].onCurve
                })
            }

            glyf.push(data)
        }

        this.glyf = glyf

        console.log('Glyf', glyf)

        pointer = tables['cmap'].offset

        // const cmap: any = {
        //     version: getUInt16(),
        //     numTables: getUInt16(),
        //     encodingRecords: [],
        //     glyphIndexMap: {},
        // }

        // if (cmap.version !== 0) {
        //     throw new Error(`cmap version should be 0 but is ${cmap.version}`)
        // }

        // for (let i = 0; i < cmap.numTables; i++) {
        //     cmap.encodingRecords.push({
        //         platformID: getUInt16(),
        //         encodingID: getUInt16(),
        //         offset: getUInt32(),
        //     })
        // }

        // let selectedOffset = -1

        // for (let i = 0; i < cmap.numTables; i++) {
        //     const { platformID, encodingID, offset } = cmap.encodingRecords[i]
        //     const isWindowsPlatform = platformID === 3 && (encodingID === 0 || encodingID === 1 || encodingID === 10)

        //     const isUnicodePlatform = platformID === 0 && (encodingID === 0 || encodingID === 1 || encodingID === 2 || encodingID === 3 || encodingID === 4)

        //     if (isWindowsPlatform || isUnicodePlatform) {
        //         selectedOffset = offset

        //         break
        //     }
        // }

        // if (selectedOffset === -1) {
        //     throw new Error(
        //         "The font doesn't contain any recognized platform and encoding."
        //     )
        // }
        
        // const format = getUInt16()

        // if (format !== 4) {
        //     throw new Error(`Unsupported format: ${format}. Required: 4.`)
        // }

        // const format4: any = {
        //     format: 4,
        //     length: getUInt16(),
        //     language: getUInt16(),
        //     segCountX2: getUInt16(),
        //     searchRange: getUInt16(),
        //     entrySelector: getUInt16(),
        //     rangeShift: getUInt16(),
        //     endCode: [],
        //     startCode: [],
        //     idDelta: [],
        //     idRangeOffset: [],
        //     glyphIndexMap: {},
        // }

        // const segCount = format4.segCountX2 >> 1

        // for (let i = 0; i < segCount; i++) {
        //     format4.endCode.push(getUInt16())
        // }

        // getUInt16()

        // for (let i = 0; i < segCount; i++) {
        //     format4.startCode.push(getUInt16())
        // }

        // for (let i = 0; i < segCount; i++) {
        //     format4.idDelta.push(getInt16())
        // }

        // const idRangeOffsetsStart = pointer

        // for (let i = 0; i < segCount; i++) {
        //     format4.idRangeOffset.push(getUInt16())
        // }

        // for (let i = 0; i < segCount - 1; i++) {
        //     let glyphIndex = 0
        //     const endCode = format4.endCode[i]
        //     const startCode = format4.startCode[i]
        //     const idDelta = format4.idDelta[i]
        //     const idRangeOffset = format4.idRangeOffset[i]
    }

    public getGlyph(index: number): Glyph | null {
        if(!this.glyf) return null
        
        return this.glyf[index] ?? null
    }
}