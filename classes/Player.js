module.exports = class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
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
            isReady: this.isReady
        };
    }
}
