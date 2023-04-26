import { AudioSource, AudioClip, Node, director, AssetManager, assetManager } from 'cc';

export class AudioMgr {

    static KEY = 'audio';

    private  _audioSource: AudioSource;
    private  get audioSource(): AudioSource {
        if (!this._audioSource) {
            const node = new Node('Audio');
            this._audioSource = node.addComponent(AudioSource);
            director.getScene().addChild(node);
        }
        return this._audioSource;
    }

    private  cacheAudioClip: Map<string, AudioClip> = new Map();

    private  readClip(name: string): Promise<AudioClip | null> {
        return new Promise((resolve, reject) => {
            const audioClip = this.cacheAudioClip.get(name);
            if (audioClip) {
                resolve(audioClip);
            } else {
                const bundle = assetManager.getBundle(AudioMgr.KEY);

                if (bundle) {
                    bundle.load(name, AudioClip, (err, clip: AudioClip) => {
                        this.cacheAudioClip.set(name, clip);
                        resolve(clip);
                    });
                } else {
                    assetManager.loadBundle(AudioMgr.KEY, (err: Error | null, bundle: AssetManager.Bundle) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        bundle.load(name, AudioClip, (err, clip: AudioClip) => {
                            this.cacheAudioClip.set(name, clip);
                            resolve(clip);
                        });
                    });
                }
            }
        });
    }


    constructor() {
        this.cacheAudioClip.clear();
    }

    /**
     * 播放背景音乐
     * @param name
     * @param loop
     * @param volume
     */
    public  playBGM(name: string, loop: boolean = true, volume: number = 1) {
        this.readClip(name)
            .then((clip: AudioClip) => {
                this.audioSource.clip = clip;
                this.audioSource.loop = loop;
                this.audioSource.volume = volume;
                this.audioSource.play();
            })

    }

    public  playOneShot(name: string, volume: number = 1) {
        this.readClip(name)
            .then((clip: AudioClip) => {
                this.audioSource.volume = volume;
                this.audioSource.playOneShot(clip, 1);
            })
    }

    public  play() {
        this.audioSource.play();
    }

    public  pause() {
        this.audioSource.pause();
    }

    public  stop() {
        this.audioSource.stop();
    }
}

