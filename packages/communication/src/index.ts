// Communication package - Message processing for WhatsApp and Slack
// This package handles parsing and processing of incoming messages

export * from './types';
export * from './types/twilio';
export * from './interfaces/message-handler';
export * from './operations';
export * from './parsers/twilio';
export * from './parsers/slack';
export * from './services/twilio';
export * from './services/slack';
export * from './services/user-mapper';
export * from './handlers';
export * from './handlers/whatsapp.handler';
export * from './handlers/slack.handler';