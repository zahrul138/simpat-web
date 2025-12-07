class TimerService {
  constructor() {
    this.subscribers = new Set();
    this.interval = null;
    this.currentTime = new Date();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.interval = setInterval(() => {
      this.currentTime = new Date();
      this.notifySubscribers();
    }, 1000); // Update UI setiap detik
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.currentTime));
  }

  getCurrentTime() {
    return this.currentTime;
  }
}

// Singleton instance
const timerService = new TimerService();

export default timerService;