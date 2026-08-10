import {
  findOrCreatePrivateConversation,
  createGroupConversation as createGroupConversationService,
  listConversationsForUser,
  getConversationById,
  updateGroupInfo,
  addMember,
  removeMember,
  setMemberRole,
} from '../services/conversation.service.js';

// Thin wrapper so every controller function doesn't need its own
// try/catch — forwards any thrown error to the centralized error handler.
// This is dispatch plumbing, not business logic.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const createPrivateConversation = asyncHandler(async (req, res) => {
  const { participantId } = req.body;
  const conversation = await findOrCreatePrivateConversation(req.user._id, participantId);
  res.status(201).json(conversation);
});

export const createGroupConversation = asyncHandler(async (req, res) => {
  const { groupName, groupDescription, participantIds } = req.body;
  const conversation = await createGroupConversationService({
    creatorId: req.user._id,
    groupName,
    groupDescription,
    participantIds,
  });
  res.status(201).json(conversation);
});

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await listConversationsForUser(req.user._id);
  res.status(200).json(conversations);
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await getConversationById(req.params.id, req.user._id);
  res.status(200).json(conversation);
});

export const updateConversationInfo = asyncHandler(async (req, res) => {
  const conversation = await updateGroupInfo(req.params.id, req.user._id, req.body);
  res.status(200).json(conversation);
});

export const addConversationMember = asyncHandler(async (req, res) => {
  const conversation = await addMember(req.params.id, req.user._id, req.body.userId);
  res.status(200).json(conversation);
});

export const removeConversationMember = asyncHandler(async (req, res) => {
  const conversation = await removeMember(req.params.id, req.user._id, req.params.userId);
  res.status(200).json(conversation);
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const conversation = await setMemberRole(req.params.id, req.user._id, req.params.userId, req.body.role);
  res.status(200).json(conversation);
});