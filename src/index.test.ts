
import { describe, expect, it } from 'vitest'
import {default as index} from '../src/index'

describe('index', () => {
    it('should export a function ', () => {
        expect(index).to.be.instanceOf(Function);
    })

})