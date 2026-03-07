import { Howl } from "howler";

const sounds = {
    hit: new Howl({ src: ["/sounds/hit.mp3"], volume: 0.6 }),
    miss: new Howl({ src: ["/sounds/miss.mp3"], volume: 0.4 }),
    sunk: new Howl({ src: ["/sounds/sunk.mp3"], volume: 0.7 }),
    place: new Howl({ src: ["/sounds/place.mp3"], volume: 0.3 }),
    ready: new Howl({ src: ["/sounds/ready.mp3"], volume: 0.5 }),
    victory: new Howl({ src: ["/sounds/victory.mp3"], volume: 0.6 }),
};

export function playSound(name: keyof typeof sounds) {
    sounds[name].play();
}

export default sounds;
