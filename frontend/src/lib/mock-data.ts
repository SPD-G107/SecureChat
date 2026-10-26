// Deprecated: Real MySQL and Socket.IO data now powers the application.
// This file only re-exports production types for backwards-compatibility.

import { Contact, ChatMessage } from '@/types';

export type MockUser = Contact;
export type MockMessage = ChatMessage;
