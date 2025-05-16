import RadishClient from "./client";

type Task<T> = () => Promise<T>;

export default class RequestQueue {
    private queue: Task<any>[] = [];
    private processing = false;
    private client: RadishClient;

    constructor(client: RadishClient) {
        this.client = client;
    }

    // Добавить новую задачу в очередь
    add<T>(task: Task<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const wrappedTask = () =>
                task()
                    .then(resolve)
                    .catch(reject);

            this.queue.push(wrappedTask);
            this.processNext();
        });
    }

    // Обработка задач по очереди
    private async processNext() {
        if (this.processing){
            return ;
        }
        this.processing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
            try {
                // Wait for 1 second before checking again
                while (!this.client.isConnected) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                await task();
            } catch (e) {
                console.error('Request failed:', e);
            }
            }
        }

        this.processing = false;
    }
}
