const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    collegeEmail: { type: String, default: null },
    collegeId: { type: String, default: null },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
    walletBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: null },
    isEmailVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
