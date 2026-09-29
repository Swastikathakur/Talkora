import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastReadAt: {
      type: Date,
      default: null,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      required: true,
      default: false,
    },
    participants: {
      type: [participantSchema],
      validate: {
        validator: (arr) => arr.length >= 2,
        message: 'A conversation needs at least 2 participants',
      },
    },
    groupName: { type: String, trim: true, maxlength: 100 },
    groupDescription: { type: String, trim: true, maxlength: 500 },
    groupAvatar: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    lastMessage: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
      text: String,
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: Date,
    },
  },
  { timestamps: true }
);


conversationSchema.pre('validate', function () {
  if (!this.isGroup && this.participants.length !== 2) {
    throw new Error(
      'A private conversation must have exactly 2 participants'
    );
  }

  if (this.isGroup && !this.groupName) {
    throw new Error('Group conversations require a groupName');
  }
});

conversationSchema.index({ isGroup: 1, 'participants.userId': 1 });
conversationSchema.index({ 'participants.userId': 1, 'lastMessage.createdAt': -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
