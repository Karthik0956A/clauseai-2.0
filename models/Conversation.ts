import mongoose, { Schema, model, models } from 'mongoose';

const MessageSchema = new Schema({
    id: { type: Number, required: true }, // Keeping consistent with frontend ID
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: String }, // Frontend sends formatted string, can parse if needed but string is easy for display
    hasAudio: { type: Boolean, default: false }
});

const ConversationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        default: 'New Conversation'
    },
    messages: [MessageSchema],
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true // For sorting recent chats
    },
    document: {
        name: String,
        mimeType: String,
        uri: String,
        context: String // Brief snippet or description
    }
}, {
    timestamps: true
});

// Prevent model overwrite upon initial compile
const Conversation = models.Conversation || model('Conversation', ConversationSchema);

export default Conversation;
