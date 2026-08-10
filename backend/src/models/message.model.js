import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      maxlength: 8,
    },
  },
  {
    _id: false,
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'file', 'voice'],
      required: true,
    },
    mimeType: String,
    size: Number,
    duration: Number,
    fileName: String,
  },
  {
    _id: false,
  }
);

const readReceiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const deliveryReceiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    text: {
      type: String,
      trim: true,
      default: '',
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    reactions: {
      type: [reactionSchema],
      default: [],
    },

    readBy: {
      type: [readReceiptSchema],
      default: [],
    },

    deliveredTo: {
      type: [deliveryReceiptSchema],
      default: [],
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },

  {
    timestamps: true,
  }
);

/* -------------------- Indexes -------------------- */

messageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

messageSchema.index({
  conversationId: 1,
  text: 'text',
});

/* -------------------- Validation -------------------- */

// No `next` callback here on purpose — modern Mongoose (v7+, and required
// as of v9) expects document pre-hooks to be synchronous functions that
// throw, or async functions that reject. The old `function(next) { next(err) }`
// callback style is no longer reliably invoked with a callback argument.
messageSchema.pre('validate', function () {
  if (!this.text && this.attachments.length === 0) {
    throw new Error('Message must contain text or at least one attachment');
  }
});

/* -------------------- Model -------------------- */

const Message = mongoose.model('Message', messageSchema);

export default Message;