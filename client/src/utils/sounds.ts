import { Howl } from "howler";

const sounds = {
    hit: new Howl({ src: ["/sounds/hit.mp3.wav"], format: ["mp3"], volume: 0.8 }),
    miss: new Howl({ src: ["/sounds/miss.mp3.mp3"], format: ["mp3"], volume: 0.4 }),
    sunk: new Howl({ src: ["/sounds/shipSunk.mp3.wav"], format: ["mp3"], volume: 0.5 }),
    victory: new Howl({ src: ["/sounds/winner.mp3.flac"], format: ["mp3"], volume: 0.6 }),
    loser: new Howl({ src: ["/sounds/loser.mp3.wav"], format: ["mp3"], volume: 0.6 }),
    juggernaut: new Howl({ src: ["/sounds/juggernaut.mp3.wav"], format: ["mp3"], volume: 0.7 }),
};

export function playSound(name: keyof typeof sounds) {
    sounds[name].play();
}
