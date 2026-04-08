class LamportClock {
  constructor(value = 0) {
    this.value = value;
  }

  tick() {
    this.value += 1;
    return this.value;
  }

  sync(remoteStamp) {
    const remote = Number(remoteStamp || 0);
    this.value = Math.max(this.value, remote) + 1;
    return this.value;
  }

  get() {
    return this.value;
  }
}

module.exports = LamportClock;
