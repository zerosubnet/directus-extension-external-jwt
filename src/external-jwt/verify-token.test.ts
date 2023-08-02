import {verify_token} from './verify-token';
import jwt from 'jsonwebtoken';

import {JwksClient} from 'jwks-rsa';

import { AuthProvider } from './authProvider/get-auth-providers';
import * as crypto from 'crypto';
import { describe, expect, it} from 'vitest'


const jwkJsonString1 = `{"keys":[{"p":"3O0m6YlnSufblB1oCYC8IIZzgx6ZnLhQBk1IYIuWJvP3OU5mKLtHE_l2kgMpM_Y95PUepwDeUdS4bACa156WjCXMBbnbwWRrGNt3uXZKlp0Krq8AH5GI-GYDCK6VE_JnmGimdHQRWrbuKEc6r0uaTJCAIoJOcL81GVLLKQZuvpM","kty":"RSA","q":"yhIy5xsSLda3cpG_L3X1ItYLSTz0i68KDqDSy-p9fq5GRD8-1JSzWa4nuBHDi0Xr6nv-icNFREFwEU9kAIY0DoRwytBvgxKMSt1XEptYi8_FpNqxeY-rEzLVEjGI2YHVMWSXOkFqtNCjAa0ByRzRsSEgmcZubfBiB2tC1yiK4GE","d":"OeEj21lbEYJbTiVDHqkeMaDhI-kMKUEJfT8XOJmaEL_b45Ij1l4eGvYyNiRyygq5lLM4g-tmnwVaPDCb9Nnmdwkwe9PaqQZGfq3ef-s-tlVDEZ2w4CdvmwvIyAqcYvLBF-QPmZy-RXRVYh3sfbJrjB-_RiQ2y3uWv-KQVwkqi8RAkHS-uwYeGyG4QNPU9wSMmyNPnnVFDJE-Q1xHlkIct28eiqdryOqP-NTBH_FC-IJLRk7i2cOnY5KRyR2rjpK56C4CjwhjVyHREsgFSfXfDZrnM6SPXDYerL345kbZ9qZdLUKlLHlKLe0_lC0FwC5ddexZ8nwbJxdi4AqLh1MKAQ","e":"AQAB","use":"sig","kid":"1","qi":"GtHMNkscK5xayJI4nmPH258C-JeOdFKAOQLHq1F73S9SG5XbbgJXnELym75MW0ChnnZSYkwav7FpIhTAdFYDoxLzE69xK6wJaqKgfQ1MP8GU5pNmWXlcr9taHTjp93uE-VC2xlyd5S_HCut1hK2NOhYuMTCp_S2t4WcOeP1kB3A","dp":"BqeGAobG-7ScIov4NEESaZBjLlHfop7Smj39rhrGPQogKjO4VAXAEFP1RFSgCxahqqHPeIxIJgLYQziJcXEva60_xfRhMCQMLcV-h7GOcZbtWXGf-VNy4rh_4uUPTHiCsk6EpQFR_H-CEOiEVf9a-G9pzKBMKI051jduMyAkec0","alg":"RS256","dq":"E2pmO7BtMbxUygxY-11xHVTFptbVhGpgJAGt32v7fOWP2NTe25wiE3bZWCVUzZf9T_1z-papnCJRe0hOioJalB6Dm-klHcn1cugLir0kZ-Kh0fI1ZUG5pVGYCXR6-rMv4dwRb8aDUzZMw0d1SXaca1GMiVn4mFWlhaL3vCaoGWE","n":"rmLVTsXLl0W6tbh1jFY02gu1HHWw8G6RKZ9DmQHR_LoxkIAiXx3mHu68o1ahjCnYozjt6aNKOHGoFHbqgN6FVKOJbVygxnvmEoFU_lNnHYQ0zmQE3tywqKqmIS54HAwZW6u6TMkDgm55WBI_yKAq6pJyXsIbHL6XJ79qCMYdbv9xkwtITqopY4brmStu8kj8LbNeIEwCk3073oG9fE-QF1EM37imIaLIdR06ykpGRSt0l423UUFyNJem-J2j2FHP_UdkUw-ybczVy15hUtPq0m1Vr65urRV60xW_OJ36OrbayrJdoipSFgM_P8zsLqkphm7tavx9LomX1pkbCfTVsw"}]}`
const jwkJsonString2 = `{"keys":[{"p":"yrhAJ_9znp0fTIEuDrPzoHfg64e8iDJz0nrB4c-VZdIMlWTIwHjCOeDQVCav1t2dtP5z6Dge04T0Vo5JABEY_hIy8iGGvq8J4fh20a9OKO00o9quk-BkIJPtqFiokcnQ53Eq4YYuSFhiyKPdipgyvRMmcM9NAOazSr3L-nT608s","kty":"RSA","q":"tXmhxZqKCGdRNIWK0Pyr3_yEhEMuf0jXpMByqSVhgyDLeS2g3pSfOxxTrgPPFgGiiQ1vYHUiCyY7rQMduft4cmiFnaOYeNXGHNY9A43zQjLmlh4V8scR--e_H2IX8v2AgbQ5-P-684mTLGnG2GmX1_U02WgcDnssACpGBWV0PI0","d":"c_egspmdr6FnWepug-i35qAqM4GyQQ8OTf95ZHCyvcAJXMvJud_8soKd6MwxaSLO_pnJhd8OKbgVOBQ6tBMYlygjQDlxjdLIz9r1juABE1HujcPFJMAcE9RoTtJ_kszdMFOEoPTEG2r8wdXEgV5M6I4Da85ss8lmGwDfT6EyUK9tcnmMegUbHGGLDmgQ0ZTLwICKKZCpchDqnMxf2gRZNkbFeQSDLCL0bsBlkqTsu-dNG1lVteFuRQmRvv5wrQN5QzQG0i2MhDkQCm0M8nmg-QU62RLfITXdOJp0tf0eaX91-zF3FVE3letIBETQMNyHOeUL0Z7KK4Dmxo6dbs2cyQ","e":"AQAB","use":"sig","kid":"1","qi":"G7V1Rerlh_siUxRj0I2AY4-ZD5GwLzCuNcoxKRXnmoyQyii-bBqWHxRUY65kraErj1p2ZBYvVtaEp3-MjtBzZxF28mztgt6gpkn-anX8uS6gPawO2g1TGdle9f7oHhaJBzW3kyhxXHtUKTrzMUj9Srx54Ze6r_R5qk8zNKnuopk","dp":"jdFIULMNF7Gj68mThwWtMl2rJBrZcg6ZqG3opSirw4em9fyD1OKmPgdgtv45lX-EjNJWE-bu6drhdIwl1b4gVd41dd6ufUfHCibgOOEDNO59HQQnjZw1b_UNFfCwPQ2K797juNI-Hq52rRa2Lfc7x7pV8iWUIUVDuM3-nUCpGPE","alg":"RS256","dq":"qx0EN5GvI5tfy3k72jDVU38D6L58AlLJ2rQHqYvwtTbgBOPMMvPKbG8aTBOVWTezbS043qezsPWdAVbV2b7O5Hm_u1M9enp_skMkBsz7GWlrWRMHOQMR5weug8X3tQvo9uPcYfen7OjE1_TpJLf0EBJKgdCT2-eyJnm1ynLONiU","n":"j7SWjPUHJ8yRyvdhkmDMsTiVr7IJoGgCgLe-JjiZ193DfOyxmL2p4UxU_xrhXvAecaY1i0ddIVttX0Dy6uY1SRmc9Iu-knc8B75jjwyoXnZq5_B8WHOsPVJpC4T8N1a8rdrqqRXyefxyqnw6fRAz2JLcZa3R_y_x2Sob7qJ8ZolJkHxEfJA4BGOvAYnfoBOKQhXcp_z1YbMuiP3-UB35VjW5chokHH-LIzhZj8Q5TYmK0LIEeZxWN46DnxxJrcqriDLFIf0oVn3aafyHj7OuS6NWCdpzG8sVadOPHLpakoRiM_6-kW7U3N4vaIWZNttCFTgaVR_XbqqCGaiLRsY6zw"}]}`
const jwksJson1 = JSON.parse(jwkJsonString1)
const jwksJson2 = JSON.parse(jwkJsonString2)

const key1 = crypto.createPrivateKey({format: 'jwk', key: JSON.parse(jwkJsonString1).keys[0]})
//const key2 = crypto.createPrivateKey({format: 'jwk', key: JSON.parse(jwkJsonString2).keys[0]})

const jwksClient1 = new JwksClient({
    cache: false,
    jwksUri: 'https://test.com',
    fetcher: () => { return Promise.resolve({keys:[
        {
            kty: jwksJson1.keys[0].kty,
            alg: jwksJson1.keys[0].alg,
            kid: jwksJson1.keys[0].kid,
            n: jwksJson1.keys[0].n,
            e: jwksJson1.keys[0].e,
            use: jwksJson1.keys[0].use,
        }
    ]}) },
})

const jwksClient2 = new JwksClient({
    cache: false,
    jwksUri: 'https://test.com',
    fetcher: () => { return Promise.resolve({keys:[
        {
            kty: jwksJson2.keys[0].kty,
            alg: jwksJson2.keys[0].alg,
            kid: jwksJson2.keys[0].kid,
            n: jwksJson2.keys[0].n,
            e: jwksJson2.keys[0].e,
            use: jwksJson2.keys[0].use,
        }
    ]}) },
})

describe('verify_token', () => {
    it('should reject if JWKSClient is not initialized', () => {
        return verify_token({} as AuthProvider, '').catch(err => {
            expect(err).to.equal('JWKSClient not initialized');
        })
    })
    it('should reject if token is invalid', () => {
        
        const invalidToken = jwt.sign({foo: 'bar'}, 'invalidkeyforjws', {algorithm: 'HS256'});
        const provider: AuthProvider = {
            JWKSClient: jwksClient1,
            label: 'test',
            driver: 'openid',
            trusted: true,
            issuer_url: 'https://test.com',
            name: 'test',
            client_id: 'test',
        }
        return verify_token(provider, invalidToken).then((result) => {
            expect(result).to.be.undefined;
        }).catch(err => {
            expect(err).to.be.instanceOf(jwt.JsonWebTokenError);
        })
    })
    it('should accept if token is valid', async () => {
        
        
        const validToken = jwt.sign({foo: 'bar'}, key1, {algorithm: 'RS256', keyid: "1"});
        
        const provider: AuthProvider = {
            JWKSClient: jwksClient1,
            label: 'test',
            driver: 'openid',
            trusted: true,
            issuer_url: 'https://test.com',
            name: 'test',
            client_id: 'test',
        }
        return verify_token(provider, validToken).then((result) => {
            expect(result).to.be.instanceOf(Object);
        })
    })
    it('should deny if token is signed by wrong issuer', async () => {
        
        
        const validToken = jwt.sign({foo: 'bar'}, key1, {algorithm: 'RS256', keyid: "1"});
        
        const provider: AuthProvider = {
            JWKSClient: jwksClient2,
            label: 'test',
            driver: 'openid',
            trusted: true,
            issuer_url: 'https://test.com',
            name: 'test',
            client_id: 'test',
        }
        return verify_token(provider, validToken).catch((err) => {
            expect(err).to.be.instanceOf(jwt.JsonWebTokenError);
        })
    })
   
})