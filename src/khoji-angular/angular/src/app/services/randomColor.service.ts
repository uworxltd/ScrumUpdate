/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


export class RandomColorService {
    #palette: string[] = [];
    #queue: string[] = [];

    constructor() { }

    init(colorPalette: string[]) {
        this.#palette = colorPalette;
        this.resetQueue();
    }

    private resetQueue() {
        this.#queue = [...this.#palette];
    }

    dequeueColor(color: string) {
        this.#queue = this.#queue.filter(c => c !== color);
    }

    enqueueColor(color: string) {
        if (this.#palette.includes(color) && !this.#queue.includes(color)) {
            this.#queue.push(color);
        }
    }

    swapColors(enqueueColor: string, dequeueColor: string) {
        this.dequeueColor(dequeueColor);
        this.enqueueColor(enqueueColor);
    }

    getRandomColor() {
        if (this.#palette.length === 0) {
            throw new Error('Color palette is empty. Call init() method to initialize color palette.');
        }

        if (this.#queue.length === 0) {
            this.resetQueue();
        }

        const index = Math.floor(Math.random() * this.#queue.length);
        const color = this.#queue[index];
        this.#queue.splice(index, 1);
        return color;
    }
}
