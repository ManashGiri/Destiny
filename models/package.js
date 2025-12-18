const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const packageSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    place: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        type: String,
        required: true,
    },
    hotel: {
        type: String,
        required: true,
    },
    image: {
        url: String,
        filename: String
    }
});

module.exports = mongoose.model("Package", packageSchema);