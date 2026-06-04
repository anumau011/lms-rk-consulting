const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
    courseId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true,
        index: true
    },
    title: { 
        type: String, 
        required: true,
        trim: true
    },

    order: { 
        type: Number, 
        required: true,
        default: 0
    },
}, { 
    timestamps: true,
    versionKey: false
});

// Compound index for efficient querying and sorting
SectionSchema.index({ courseId: 1, order: 1 });

// Statics
SectionSchema.statics.getNextOrder = async function(courseId) {
    const lastSection = await this.findOne({ courseId })
        .sort({ order: -1 })
        .select('order');
    
    return lastSection ? lastSection.order + 1 : 0;
};

SectionSchema.statics.reorderSections = async function(courseId, sectionOrders) {
    // sectionOrders: [{ sectionId, order }, ...]
    const bulkOps = sectionOrders.map(({ sectionId, order }) => ({
        updateOne: {
            filter: { _id: sectionId, courseId },
            update: { $set: { order } }
        }
    }));

    return this.bulkWrite(bulkOps);
};

module.exports = mongoose.model('Section', SectionSchema);