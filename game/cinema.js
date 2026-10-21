// game/cinema.js - Cutscene director, dialogue sequencing and camera focus

export class CinemaDirector {
  constructor(onUpdate, onFinish) {
    this.lines = [];
    this.currentIndex = 0;
    this.active = false;
    this.onUpdate = onUpdate || (() => {});
    this.onFinish = onFinish || (() => {});
  }

  start(lines = []) {
    if (!lines || lines.length === 0) {
      this.active = false;
      this.onFinish();
      return;
    }

    this.lines = lines;
    this.currentIndex = 0;
    this.active = true;
    this._broadcastCurrent();
  }

  next() {
    if (!this.active) return;
    this.currentIndex++;
    if (this.currentIndex >= this.lines.length) {
      this.active = false;
      this.onFinish();
    } else {
      this._broadcastCurrent();
    }
  }

  skip() {
    if (!this.active) return;
    this.active = false;
    this.onFinish();
  }

  _broadcastCurrent() {
    const line = this.lines[this.currentIndex];
    this.onUpdate({
      active: true,
      index: this.currentIndex,
      total: this.lines.length,
      speaker: line.speaker,
      text: line.text,
      cameraFocus: line.speaker,
    });
  }
}
