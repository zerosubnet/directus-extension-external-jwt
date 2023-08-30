import {default as Keyv, Store} from 'keyv';
import env from './config/config';
import {default as KeyvRedis} from '@keyv/redis';

// check if redis is defined

const cache: Keyv | null = getCache();




function getCache(): Keyv | null {
    if(env['CACHE_ENABLED'] !== true) return null;

    // check namespace
    let namespace = env['CACHE_JWT_NAMESPACE'];
    if(namespace == null || namespace === '') {
        namespace = 'exjwt';
    }

    let ttl = env['CACHE_JWT_TTL'];
    if (ttl == null || ttl === '') {
        ttl = 5000
    }

    let uri = '';
    let store: Store<string | undefined> | undefined = undefined;
    if(env['CACHE_STORE'] === 'redis') {
        uri = env['REDIS']
        
        if(uri == null || uri === '') {
            uri = `redis://${env['REDIS_USERNAME'] || '' }:${env['REDIS_PASSWORD'] || ''}@${env['REDIS_HOST']}:${env['REDIS_PORT']}`;
        }

        
        store = new KeyvRedis(uri);
    }

    try {
        const keyv = new Keyv(uri, {
            namespace: namespace,
            ttl,
            store: store
        });

        keyv.on('error', (err) => {
            throw new Error("CACHE: could not connect: " + err)
        });
    
        return  keyv
    } catch(e) {
        throw new Error("CACHE: could not connect to database: " + e)
    }
    

    
}

export function CacheEnabled(): boolean {
    return cache !== null;
}

export async function CacheSet(key: string, value: any) {
    if(cache === null) return false;
    return cache.set(key, value);
}

export async function CacheGet(key: string) {
    if(cache === null) return null;
    return cache.get(key);
}