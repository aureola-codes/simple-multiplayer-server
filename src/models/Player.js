module.exports = class Player {
    constructor(id, name, data = {}) {
        this.id = id;
        this.name = name;
        this.data = data;
        this.isReady = false;
    }

    getMinResponse() {
        return {
            id: this.id,
            name: this.name
        };
    }

    getFullResponse() {
        return {
            id: this.id,
            name: this.name,
            data: this.data,
            isReady: this.isReady
        };
    }
}
