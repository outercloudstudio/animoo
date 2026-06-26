import { hex, project, clip } from '@outercloud/animoo'

const clip1 = clip('Clip 1', {}, function* ({ background, add }: any) {
    background(hex('#FFAF00'))  
})

export default project([ clip1 ])